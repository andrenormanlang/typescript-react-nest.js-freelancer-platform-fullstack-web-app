import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserControllerDto } from './dto/create-user-controller.dto';
import { CreateUsersDto } from './dto/create-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { DeleteUsersDto } from './dto/delete.dto';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { plainToClass } from 'class-transformer';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService // Inject CloudinaryService
  ) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all users' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: [UserResponseDto],
  })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => plainToClass(UserResponseDto, user));
  }

  // TODO Implement bulk create with multiform data
  @Post('bulk-create')
  @UseInterceptors(FilesInterceptor('skillImageUrls', 4)) // Assume up to 4 files
  @ApiOperation({ summary: 'Bulk create users' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Bulk create users',
    type: CreateUsersDto, // Adjust based on actual payload
  })
  @ApiResponse({
    status: 201,
    description: 'Users successfully created',
    type: [UserResponseDto],
  })
  async createBulk(
    @UploadedFiles() avatars: Express.Multer.File[],
    @Body() body: any // Use raw body instead of DTO
  ): Promise<UserResponseDto[]> {
    try {
      console.log('Received files:', avatars);
      console.log('Received Body:', body);

      // Manually parse the body to fit the expected DTO structure
      const createUsersDto: CreateUsersDto = {
        users: Array.isArray(body.username)
          ? body.username.map((_, index) => ({
              username: body.username[index],
              email: body.email[index],
              password: body.password[index],
              skillImageUrls: [], // This will be populated with Cloudinary URLs
            }))
          : [
              {
                username: body.username,
                email: body.email,
                password: body.password,
                skillImageUrls: [],
              },
            ],
      };

      console.log('Parsed DTO:', createUsersDto);

      // Handle file upload logic
      if (avatars && avatars.length > 0) {
        const uploadResults = await Promise.all(
          avatars.map((file) => this.cloudinaryService.uploadImage(file))
        );
        console.log('Uploaded avatars:', uploadResults);

        createUsersDto.users.forEach((userDto, index) => {
          userDto.skillImageUrls = uploadResults.map(
            (result) => result.secure_url
          );
        });
      }

      // Continue with bulk creation
      const createdUsers = await this.usersService.createBulk(
        createUsersDto.users
      );
      console.log('Users successfully created:', createdUsers);
      return createdUsers.map((user) => plainToClass(UserResponseDto, user));
    } catch (error) {
      console.error('Error in createBulk:', error);
      throw new InternalServerErrorException(
        'An error occurred during bulk user creation.'
      );
    }
  }

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'skillImageUrls', maxCount: 10 },
    ])
  )
  @ApiOperation({ summary: 'Register a new user' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Register a new user',
    type: CreateUserControllerDto,
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    // Not sure if this is necessary
    // type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async register(
    @Body() createUserControllerDto: CreateUserControllerDto,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      skillImageUrls?: Express.Multer.File[];
    }
  ): Promise<UserResponseDto> {
    try {
      // Process avatars if any
      if (files.avatar && files.avatar.length > 0) {
        const uploadResult = await this.cloudinaryService.uploadImage(
          files.avatar[0]
        );
        createUserControllerDto.avatarUrl = uploadResult.secure_url;
        console.log('Uploaded avatar:', createUserControllerDto.avatarUrl);
      }

      // Process skill images if any
      if (files.skillImageUrls && files.skillImageUrls.length > 0) {
        const uploadResults = await Promise.all(
          files.skillImageUrls.map((file) =>
            this.cloudinaryService.uploadImage(file)
          )
        );
        createUserControllerDto.skillImageUrls = uploadResults.map(
          (result) => result.secure_url
        );
        console.log(
          'Uploaded skill images:',
          createUserControllerDto.skillImageUrls
        );
      }

      // Log before creating the user
      console.log('Creating user with data:', createUserControllerDto);

      const createdUser = await this.usersService.create(
        createUserControllerDto
      );
      return plainToClass(UserResponseDto, createdUser);
    } catch (error) {
      console.error('Error during user registration:', error.message);
      throw new BadRequestException('Registration failed.');
    }
  }
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify user email' })
  async verifyEmail(
    @Query('userId') userId: string
  ): Promise<{ message: string }> {
    await this.usersService.verifyEmail(userId);
    return { message: 'Email successfully verified' };
  }

  @Post('resend-verification-email')
  async resendVerificationEmail(
    @Body('email') email: string
  ): Promise<{ message: string }> {
    await this.usersService.resendVerificationEmail(email);
    return { message: 'Verification email resent. Please check your inbox.' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid UUID');
    }
    // console.log(`Fetching user with ID: ${id}`);
    const user = await this.usersService.findOne(id);
    return plainToClass(UserResponseDto, user);
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'skillImageUrls', maxCount: 10 },
    ])
  )
  @ApiOperation({ summary: 'Update a user by ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update user data',
    type: UpdateUserDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully updated',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() userDto: UpdateUserDto,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      skillImageUrls?: Express.Multer.File[];
    }
  ): Promise<UserResponseDto> {
    // Optional: Log incoming files for debugging
    console.log('Received skillImageUrls:', files.skillImageUrls);
    console.log('Received avatar:', files.avatar);

    // Process avatar upload (profile image)
    if (files.avatar && files.avatar.length > 0) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        files.avatar[0]
      );
      userDto.avatarUrl = uploadResult.secure_url;
      console.log('Uploaded avatar:', userDto.avatarUrl);
    }

    // Skill images are handled in UsersService.update (uploads + append)
    const updatedUser = await this.usersService.update(
      id,
      userDto,
      files.skillImageUrls
    );
    return plainToClass(UserResponseDto, updatedUser);
  }

  @Put(':id/update-password')
  @ApiOperation({ summary: 'Update user password' })
  @ApiConsumes('application/json')
  @ApiBody({
    description: 'New password data',
    type: UpdatePasswordDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Password successfully updated',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePassword(
    @Param('id') id: string,
    @Body() updatePasswordDto: UpdatePasswordDto
  ): Promise<{ message: string }> {
    // Optional: Verify current password
    const user = await this.usersService.findOne(id);
    const isMatch = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password
    );
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect.');
    }

    await this.usersService.updatePassword(id, updatePasswordDto.newPassword);
    return { message: 'Password successfully updated' };
  }

  @Delete('delete-bulk')
  @ApiOperation({ summary: 'Bulk delete users' })
  @ApiResponse({
    status: 200,
    description: 'Users successfully deleted',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async deleteBulk(
    @Body() deleteUsersDto: DeleteUsersDto
  ): Promise<{ message: string }> {
    await this.usersService.deleteBulk(deleteUsersDto.userIds);
    return { message: 'Users successfully deleted' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User successfully deleted',
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('Invalid UUID');
    }
    await this.usersService.delete(id);
    return { message: 'User successfully deleted' };
  }

  // Helper method to validate UUID
  private isValidUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}
