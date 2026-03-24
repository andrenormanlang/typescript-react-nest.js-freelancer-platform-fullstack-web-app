import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { MailService } from '@/mail/mail.service';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { CreateUserDto } from './dto/create-user-service.dto';
import { Skill } from '../skills/entities/skill.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '@/cloudinary/cloudinary.service';
import { UploadApiResponse } from 'cloudinary';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Skill)
    private readonly skillsRepository: Repository<Skill>,

    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async findByEmail(email: string): Promise<User | undefined> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['skills'],
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if the email already exists
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    console.log('Generated email verification token:', emailVerificationToken);

    // Create a new user instance
    const newUser = this.usersRepository.create({
      email: createUserDto.email,
      username: createUserDto.username,
      role: createUserDto.role,
      password: hashedPassword,
      isAdmin: createUserDto.isAdmin,
      avatarUrl: createUserDto.avatarUrl,
      skillImageUrls: createUserDto.skillImageUrls,
      isEmailVerified: false,
    });

    // Save the user first
    const savedUser = await this.usersRepository.save(newUser);
    console.log('Saved user:', savedUser);

    // Now create and associate skills if provided
    if (createUserDto.skills && createUserDto.skills.length > 0) {
      const skills = createUserDto.skills.map((skillDto) =>
        this.skillsRepository.create({
          ...skillDto,
          user: savedUser,
        })
      );
      savedUser.skills = await this.skillsRepository.save(skills);
    }

    // Send verification email
    const verificationLink = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?userId=${newUser.id}`;
    await this.mailService.sendVerificationEmail(
      newUser.email,
      verificationLink
    );

    // Return the user with associated skills
    return this.usersRepository.findOne({
      where: { id: savedUser.id },
      relations: ['skills'],
    });
  }

  async verifyEmail(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isEmailVerified = true;

    await this.usersRepository.save(user);
    console.log('User updated:', user);
  }

  // users.service.ts
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const verificationLink = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?userId=${user.id}`;
    await this.mailService.sendVerificationEmail(user.email, verificationLink);
  }

  async createBulk(usersData: CreateUserDto[]): Promise<User[]> {
    console.log('Received usersData:', usersData);

    if (!usersData || !Array.isArray(usersData)) {
      console.error('usersData is not an array:', usersData);
      throw new ConflictException('Invalid data format for bulk creation.');
    }

    const users = await Promise.all(
      usersData.map(async (userDto) => {
        // Check for existing email
        const existingUser = await this.findByEmail(userDto.email);
        if (existingUser) {
          throw new ConflictException(
            `A user with email ${userDto.email} already exists.`
          );
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(userDto.password, 10);

        // Create user instance
        const user = this.usersRepository.create({
          email: userDto.email,
          username: userDto.username,
          password: hashedPassword,
          isAdmin: userDto.isAdmin,
          skillImageUrls: userDto.skillImageUrls,
        });

        // Associate skills
        if (userDto.skills && userDto.skills.length > 0) {
          const skills = userDto.skills.map((skillDto) => {
            return this.skillsRepository.create({
              ...skillDto,
              user: user,
            });
          });
          user.skills = await this.skillsRepository.save(skills);
        }

        return this.usersRepository.save(user);
      })
    );

    return users;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    skillImageUrls?: Express.Multer.File[]
  ): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['skills'],
    });

    if (!user) throw new NotFoundException('User not found');

    // Update fields if provided
    if (updateUserDto.email) {
      user.email = updateUserDto.email;
    }
    if (updateUserDto.username) {
      user.username = updateUserDto.username;
    }
    if (updateUserDto.isEmailVerified !== undefined) {
      user.isEmailVerified = updateUserDto.isEmailVerified;
    }
    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }
    if (updateUserDto.isAdmin !== undefined) {
      user.isAdmin = updateUserDto.isAdmin;
    }
    if (updateUserDto.avatarUrl) {
      user.avatarUrl = updateUserDto.avatarUrl;
    }
    if (updateUserDto.skillImageUrls) {
      user.skillImageUrls = updateUserDto.skillImageUrls;
    }
    if (updateUserDto.password) {
      user.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    if (updateUserDto.isOnline !== undefined) {
      user.isOnline = updateUserDto.isOnline;
    }

    // Handle new skill images
    if (skillImageUrls && skillImageUrls.length > 0) {
      const uploadedUrls = await Promise.all(
        skillImageUrls.map((file) => this.cloudinaryService.uploadFile(file))
      );

      // Filter out any failed uploads
      const successfulUploads = uploadedUrls.filter(
        (result): result is UploadApiResponse =>
          (result as UploadApiResponse).secure_url !== undefined
      );

      const newSkillImageUrls = successfulUploads.map(
        (result) => result.secure_url
      );
      user.skillImageUrls = [
        ...(user.skillImageUrls || []),
        ...newSkillImageUrls,
      ];
    }

    // Add new skills if provided
    if (updateUserDto.skills && updateUserDto.skills.length > 0) {
      const skills = updateUserDto.skills.map((skillDto) => {
        return this.skillsRepository.create({
          ...skillDto,
          user: user,
        });
      });
      user.skills = [
        ...user.skills,
        ...(await this.skillsRepository.save(skills)),
      ];
    }

    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new InternalServerErrorException(
        'An error occurred while updating the user.'
      );
    }
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.password = await bcrypt.hash(newPassword, 10);
    try {
      await this.usersRepository.save(user);
    } catch (error) {
      console.error('Error updating password:', error);
      throw new InternalServerErrorException('Failed to update password.');
    }
  }

  async delete(id: string): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('No user found with the provided ID.');
    }
  }

  async deleteBulk(userIds: string[]): Promise<void> {
    const result = await this.usersRepository.delete(userIds);
    if (result.affected === 0) {
      throw new NotFoundException('No users found with the provided IDs.');
    }
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: ['skills'] });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['skills'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // Used for chat service
  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['skills'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // This method would use your authentication system, like a request context, to determine the authenticated user.
  async getAuthenticatedUser(authUserId: string): Promise<User> {
    const user = await this.findById(authUserId);
    if (!user) {
      throw new NotFoundException('Authenticated user not found');
    }
    return user;
  }
}
