import os
import sys

# Add app to path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.database import engine, SessionLocal, Base
    from app.models import User, RoleEnum
    from app.auth import get_password_hash
except ImportError as e:
    print(f"Error importing app modules: {e}")
    sys.exit(1)

def seed():
    print("Dropping existing tables and recreating them to apply schema changes...")
    try:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("Tables recreated successfully!")
    except Exception as e:
        print(f"Database operation failed! Error: {e}")
        sys.exit(1)

    db = SessionLocal()
    
    users_to_seed = [
        {
            "name": "Harshal Employee",
            "email": "harshal@accops.com",
            "personal_email": "harshal.employee@gmail.com",
            "password": "password123",
            "role": RoleEnum.full_time,
            "department": "Engineering",
            "doj": "2024-05-01"
        },
        {
            "name": "Accops HR",
            "email": "hr@accops.com",
            "personal_email": "hr.accops@gmail.com",
            "password": "password123",
            "role": RoleEnum.hr,
            "department": "Human Resources",
            "doj": "2023-10-15"
        },
        {
            "name": "Super Admin",
            "email": "admin@accops.com",
            "personal_email": "admin.system@accops.com",
            "password": "password123",
            "role": RoleEnum.admin,
            "department": "IT",
            "doj": "2023-01-01"
        }
    ]

    for user_data in users_to_seed:
        new_user = User(
            name=user_data["name"],
            email=user_data["email"],
            personal_email=user_data["personal_email"],
            hashed_password=get_password_hash(user_data["password"]),
            role=user_data["role"],
            department=user_data["department"],
            doj=user_data["doj"],
            is_first_login=(user_data["role"] == RoleEnum.full_time) # Only force reset for employees
        )
        db.add(new_user)
        print(f"Added user: {user_data['email']} ({user_data['role']})")
            
    db.commit()
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed()
