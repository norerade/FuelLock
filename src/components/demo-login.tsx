import { ArrowRight } from "lucide-react";

export default function DemoLogin({ next }: { next?: string }) {
  const action = next
    ? "/api/demo/login?next=" + encodeURIComponent(next)
    : "/api/demo/login";
  return (
    <form action={action} method="post">
      <button className="primary" type="submit">
        Try demo <ArrowRight size={16} />
      </button>
    </form>
  );
}
