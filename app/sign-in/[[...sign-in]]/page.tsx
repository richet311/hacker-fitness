import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-gray-600">Sign in to your account</p>
        </div>
        <SignIn 
          appearance={{
            variables: {
              colorPrimary: "#8B5CF6",
            },
          }}
          redirectUrl="/personalized-plan"
        />
      </div>
    </div>
  )
}
