from pydantic import BaseModel, EmailStr, field_validator

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nombre_restaurante: str
    telefono: str | None = None

    @field_validator("password")
    @classmethod
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres")
        if len(v) > 72:
            raise ValueError("La contraseña no puede tener más de 72 caracteres")
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str