import AuthForm from "./AuthForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  return <AuthForm mode="login" resetDone={reset === "1"} />;
}
