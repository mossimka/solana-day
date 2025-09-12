import React from "react";

export default function SignInPage() {
  return (
    <main>
      <div className="min-h-screen flex items-center justify-center">
        <div className="">
          <p>Sign In</p>
          <form>
            <label>
              Email:
              <input type="email" name="email" required />
            </label>
            <label>
              Password:
              <input type="password" name="password" required />
            </label>
            <button type="submit">Sign In</button>
          </form>
        </div>
      </div>
    </main>
  );
}
