from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr

from database import engine
from model import User
from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
)
from email_utils import send_reset_email

router = APIRouter(prefix="/auth", tags=["Auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ======================
# SCHEMAS
# ======================
class RegisterSchema(BaseModel):
    username: str
    email: EmailStr
    password: str


class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class ForgotSchema(BaseModel):
    email: EmailStr


class ResetSchema(BaseModel):
    token: str
    new_password: str


# ======================
# DB DEPENDENCY
# ======================
def get_db():
    with Session(engine) as session:
        yield session


# ======================
# AUTH DEPENDENCY
# ======================
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.exec(select(User).where(User.email == email)).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


# ======================
# REGISTER
# ======================
@router.post("/register")
def register(data: RegisterSchema, db: Session = Depends(get_db)):
    if db.exec(select(User).where(User.email == data.email)).first():
        raise HTTPException(status_code=400, detail="Email already exists")

    if db.exec(select(User).where(User.username == data.username)).first():
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role="user",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User registered successfully"}


# ======================
# LOGIN
# ======================
@router.post("/login")
def login(data: LoginSchema, db: Session = Depends(get_db)):
    user = db.exec(select(User).where(User.email == data.email)).first()

    print("LOGIN EMAIL:", data.email)
    print("USER FOUND:", bool(user))

    if user:
        print("HASH IN DB:", user.hashed_password)
        print("PASSWORD MATCH:",
              verify_password(data.password, user.hashed_password))

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "email": user.email}

# ======================
# FORGOT PASSWORD
# ======================
@router.post("/forgot-password")
def forgot_password(data: ForgotSchema, db: Session = Depends(get_db)):
    user = db.exec(select(User).where(User.email == data.email)).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # generate reset token
    token = create_access_token({"sub": user.email})

    # 👇 directly return token (DEV ONLY)
    return {
        "message": "Use this token to reset password",
        "reset_token": token
    }



# ======================
# RESET PASSWORD
# ======================
@router.post("/reset-password")
def reset_password(data: ResetSchema, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.exec(select(User).where(User.email == email)).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(data.new_password)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Password reset successful"}

# ======================
# ME (PROTECTED)
# ======================
@router.get("/me")
def read_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
    }
