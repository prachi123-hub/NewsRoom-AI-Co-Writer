def send_reset_email(email: str, token: str):
    print("PASSWORD RESET LINK:")
    print(f"http://localhost:5173/reset-password?token={token}")
