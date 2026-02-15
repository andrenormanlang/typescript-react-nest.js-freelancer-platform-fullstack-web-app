import { Spinner } from "../components/shadcn/ui/spinner";

type Props = {
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
};

const LoadingSpinner = ({
  fullScreen = false,
  overlay = false,
  className = "",
}: Props) => {
  const base = "flex justify-center items-center";

  if (fullScreen) {
    return (
      <div
        className={`${base} fixed inset-0 z-50 ${overlay ? "bg-black/50" : ""}`}
      >
        <Spinner size="large" className="text-teal-500" />
      </div>
    );
  }

  return (
    <div className={`${base} w-full ${className}`}>
      <Spinner size="large" className="text-teal-500" />
    </div>
  );
};

export default LoadingSpinner;
