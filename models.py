import json
from sqlalchemy import TIMESTAMP, create_engine, Column, String, Integer, Boolean, Text, Enum, ForeignKey, DateTime, JSON, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()
Base = declarative_base()




class Category(Base):
    __tablename__ = 'categories'

    id = Column(String, primary_key=True, nullable=False)
    name = Column(String, nullable=False)
    parent_id = Column(String, ForeignKey('categories.id'), nullable=True)
    parent = relationship('Category', remote_side=[id], backref="subcategories")

class User(Base):
    __tablename__ = 'users'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    verified = Column(Boolean, default=False)
    tokens = Column(Integer, default=0)


class Document(Base):
    __tablename__ = 'documents'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_by = Column(String, ForeignKey('users.id'), nullable=False)
    status = Column(String, nullable=False)
    category_id = Column(String, ForeignKey('categories.id'), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    popularity = Column(Integer, default=0)
    is_edit = Column(Boolean, default=False)

class ModerationLog(Base):
    __tablename__ = 'moderation_logs'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey('documents.id'), nullable=False)
    moderator_id = Column(String, ForeignKey('users.id'), nullable=False)
    decision = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Quiz(Base):
    __tablename__ = 'quizzes'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey('documents.id', ondelete='CASCADE'), nullable=False)  
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    is_ready = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Question(Base):
    __tablename__ = 'questions'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id = Column(String, ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False) 
    question_text = Column(Text, nullable=False)
    correct_answer = Column(String, nullable=False)


class Answer(Base):
    __tablename__ = 'answers'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    question_id = Column(String, ForeignKey('questions.id', ondelete='CASCADE'), nullable=False) 
    answer_text = Column(String, nullable=False)
    is_correct = Column(Boolean, nullable=False)


class QuizResult(Base):
    __tablename__ = 'quiz_results'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    quiz_id = Column(String, ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    score = Column(Integer, nullable=False)
    completed_at = Column(DateTime, default=datetime.utcnow)



class VerificationRun(Base):
    __tablename__ = "verification_runs"
    
    id = Column(Text, primary_key=True, default=lambda: f"verification_verificationrun_{uuid.uuid4()}", index=True)
    serviceProviderID = Column(String, nullable=False)
    verificationTypeCode = Column(String, nullable=False)
    verificationProcessCode = Column(String, nullable=False)
    status = Column(String, nullable=False)
    effective_date = Column(TIMESTAMP(True), nullable=True, default=func.current_timestamp())
    expiration_date = Column(TIMESTAMP(True), nullable=True, default=func.current_timestamp())
    entityType = Column(String)  
    entityID = Column(String)  
    remaining_tries = Column(Integer, nullable=False, default=4)
    last_try_timestamp = Column(
        TIMESTAMP(True),
        nullable=False,
        default=func.current_timestamp(),
    )
    comment = Column(Text)


    vendor_status = Column(String)  
    fail_reason = Column(String)  
    try_count = Column(Integer, default=0)  

    proofs = relationship("Proof", back_populates="verification_run")

    def __str__(self):
        return (f"VerificationRun(id={self.id}, serviceProviderID={self.serviceProviderID}, "
                f"verificationTypeCode={self.verificationTypeCode}, verificationProcessCode={self.verificationProcessCode}, "
                f"status={self.status}, effective_date={self.effective_date}, expiration_date={self.expiration_date}, "
                f"entityType={self.entityType}, entityID={self.entityID}, remaining_tries={self.remaining_tries}, "
                f"last_try_timestamp={self.last_try_timestamp}, comment={self.comment}, "
                f"vendor_status={self.vendor_status}, fail_reason={self.fail_reason}, try_count={self.try_count})")

    def __repr__(self):
        return str(self)

    def to_json(self):
        return json.dumps({
            "id": str(self.id),
            "serviceProviderID": self.serviceProviderID,
            "verificationTypeCode": self.verificationTypeCode,
            "verificationProcessCode": self.verificationProcessCode,
            "status": self.status,
            "effective_date": str(self.effective_date),
            "expiration_date": str(self.expiration_date),
            "entityType": self.entityType,
            "entityID": self.entityID,
            "remaining_tries": self.remaining_tries,
            "last_try_timestamp": str(self.last_try_timestamp),
            "comment": self.comment,
            "vendor_status": self.vendor_status,  
            "fail_reason": self.fail_reason,  
            "try_count": self.try_count  
        })


class Verification(Base):
    __tablename__ = "verifications"
    
    id = Column(Text, primary_key=True, default=f"verification_verification_{uuid.uuid4()}", index=True)
    serviceProviderID = Column(String, nullable=False)
    verificationTypeCode = Column(String, nullable=False)
    verificationProcessCode = Column(String, nullable=False)
    status = Column(String, nullable=False) 
    entityType = Column(String)
    entityID = Column(String)
    verificationRunID = Column(Text, ForeignKey("verification_runs.id"))
    effective_date = Column(TIMESTAMP(True), nullable=True, default=func.current_timestamp())
    expiration_date = Column(TIMESTAMP(True), nullable=True, default=func.current_timestamp())
    comment = Column(Text)
    data = Column(JSON, nullable=True) 
    verification_run = relationship("VerificationRun")

    def __str__(self):
        return f"Verification(id={self.id}\nserviceProviderID={self.serviceProviderID}\nverificationTypeCode={self.verificationTypeCode}\nverificationProcessCode={self.verificationProcessCode}\nstatus={self.status}\nentityType={self.entityType}\nentityID={self.entityID}\nverificationRunID={self.verificationRunID}\neffective_date={self.effective_date}\nexpiration_date={self.expiration_date}\ncomment={self.comment}\ndata={self.data})"

    def __repr__(self):
        return str(self)

    def to_json(self):
        return json.dumps({
            "id": str(self.id),
            "serviceProviderID": self.serviceProviderID,
            "verificationTypeCode": self.verificationTypeCode,
            "verificationProcessCode": self.verificationProcessCode,
            "status": self.status,
            "entityType": self.entityType,
            "entityID": self.entityID,
            "verificationRunID": str(self.verificationRunID),
            "effective_date": str(self.effective_date),
            "expiration_date": str(self.expiration_date),
            "comment": self.comment,
            "data": self.data 
        })





class Proof(Base):
    __tablename__ = "proofs"
    
    id = Column(Text, primary_key=True, default=f"verification_proof_{uuid.uuid4()}", index=True)
    verificationRunID = Column(Text, ForeignKey("verification_runs.id"))
    status = Column(String)
    uploadDate = Column(TIMESTAMP(True), nullable=True, default=func.current_timestamp())
    expirationDate = Column(TIMESTAMP(True), nullable=True, default=func.current_timestamp())
    entityType = Column(String)
    entityID = Column(String)

    type = Column(String)

    __mapper_args__ = {
        'polymorphic_identity': 'proof',
        'polymorphic_on': type
    }

    verification_run = relationship("VerificationRun", back_populates="proofs")

    def __str__(self):
        return f"Proof(id={self.id}\nverificationRunID={self.verificationRunID}\nstatus={self.status}\nuploadDate={self.uploadDate}\nexpirationDate={self.expirationDate}\nentityType={self.entityType}\nentityID={self.entityID})"

    def __repr__(self):
        return str(self)

    def to_json(self):
        return json.dumps({
            "id": str(self.id),
            "verificationRunID": str(self.verificationRunID),
            "status": self.status,
            "uploadDate": str(self.uploadDate),
            "expirationDate": str(self.expirationDate),
            "entityType": self.entityType,
            "entityID": self.entityID
        })


class EmailProof(Proof):
    __tablename__ = "email_proofs"
    
    id = Column(Text, ForeignKey("proofs.id", ondelete="CASCADE"), primary_key=True, default=f"verification_EmailProof_{uuid.uuid4()}")
    main_param = Column(String)  
    verification_code = Column(String)  
    prefix = Column(String) 
    ip_address = Column(String) 
    correct_code_submission_time = Column(TIMESTAMP(True), nullable=True)

    __mapper_args__ = {
        'polymorphic_identity': 'email_proof',
    }

    def __str__(self):
        return (f"EmailProof(id={self.id}\nmain_param={self.main_param}\nverification_code={self.verification_code}\n"
                f"prefix={self.prefix}\nip_address={self.ip_address}\n"
                f"correct_code_submission_time={self.correct_code_submission_time}\n"
                f"verificationRunID={self.verificationRunID}\nstatus={self.status}\nuploadDate={self.uploadDate}\n"
                f"expirationDate={self.expirationDate}\nentityType={self.entityType}\nentityID={self.entityID})")

    def __repr__(self):
        return str(self)

    def to_json(self):
        return json.dumps({
            "id": str(self.id),
            "main_param": self.main_param,
            "verification_code": self.verification_code,
            "prefix": self.prefix,  
            "ip_address": self.ip_address,  
            "correct_code_submission_time": str(self.correct_code_submission_time),  
            "verificationRunID": str(self.verificationRunID),
            "status": self.status,
            "uploadDate": str(self.uploadDate),
            "expirationDate": str(self.expirationDate),
            "entityType": self.entityType,
            "entityID": self.entityID
        })
    

class VerificationRunDuplicate(Base):
    __tablename__ = "verification_run_duplicate"

    id = Column(Text, primary_key=True, default=f"verification_verificationrunduplicate_{uuid.uuid4()}", index=True)
    entityType = Column(String)  
    entityID = Column(String)  
    serviceProviderID = Column(String, nullable=False)
    verificationTypeCode = Column(String, nullable=False)
    verificationProcessCode = Column(String, nullable=False)
    originalVerificationRunID = Column(Text) 
    created_at = Column(TIMESTAMP(True), nullable=True, default=func.current_timestamp())

    def __str__(self):
        return (f"VerificationRunDuplicate(id={self.id}, entityType={self.entityType}, entityID={self.entityID}, "
                f"serviceProviderID={self.serviceProviderID}, verificationTypeCode={self.verificationTypeCode}, "
                f"verificationProcessCode={self.verificationProcessCode}, originalVerificationRunID={self.originalVerificationRunID}, "
                f"created_at={self.created_at})")

    def __repr__(self):
        return str(self)

    def to_json(self):
        return json.dumps({
            "id": str(self.id),
            "entityType": self.entityType,
            "entityID": self.entityID,
            "serviceProviderID": self.serviceProviderID,
            "verificationTypeCode": self.verificationTypeCode,
            "verificationProcessCode": self.verificationProcessCode,
            "originalVerificationRunID": str(self.originalVerificationRunID),
            "created_at": str(self.created_at)
        })




DATABASE_NUMBER = os.getenv("DATABASE_NUMBER", "")  
DATABASE_URL = "postgresql://postgres:postgres@13.60.170.48:5432/poseidon"

engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,     
    pool_recycle=1500       
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


