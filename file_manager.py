from io import BytesIO
import os
import boto3
from fastapi.responses import FileResponse, StreamingResponse

class FileManager:
    def __init__(self):
        from dotenv import load_dotenv

        load_dotenv()
        self.files_dir = "files"
        self.environment = os.getenv('ENVIRONMENT')
        self.aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.region_name= os.getenv('AWS_REGION_NAME')
        self.s3_bucket_name = os.getenv('S3_BUCKET_NAME')

        if self.environment == "EC2":
            self.is_local_storage = False
            self.s3 = boto3.client('s3', aws_access_key_id=self.aws_access_key_id, aws_secret_access_key=self.aws_secret_access_key, region_name=self.region_name)
        else:
            self.is_local_storage = True
    
    async def save_file(self, filename:str, file):
        
        if self.is_local_storage:
            file_path = os.path.join(self.files_dir, filename)
            with open(file_path, "wb") as f:
                f.write(await file.read())
            return file_path
        else:
            self.s3.upload_fileobj(file.file, self.s3_bucket_name, filename)
            return f"https://{self.s3_bucket_name}.s3.{self.region_name}.amazonaws.com/{filename}"
        

    async def get_file(self, filename: str):
        if self.is_local_storage:
            file_path = os.path.join(self.files_dir, filename)
            if os.path.exists(file_path):
                return FileResponse(file_path, media_type="application/octet-stream", filename=filename)
            else:
                return {"error": "File not found"}
        else:
            try:
                file_obj = self.s3.get_object(Bucket=self.s3_bucket_name, Key=filename)
                file_content = file_obj['Body'].read()
                return StreamingResponse(BytesIO(file_content), media_type="application/octet-stream",
                                         headers={"Content-Disposition": f"attachment; filename={filename}"})
            except Exception as e:
                return {"error": str(e)}


    async def delete_file(self, filename: str):
        if self.is_local_storage:
            file_path = os.path.join(self.files_dir, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
                return {"message": f"File {filename} deleted successfully from local storage."}
            return {"error": "File not found"}

        try:
            self.s3.delete_object(Bucket=self.s3_bucket_name, Key=filename)
            return {"message": f"File {filename} deleted successfully from S3."}
        except Exception as e:
            return {"error": str(e)}
        
    async def get_file_content(self, filename: str) -> str:
        if self.is_local_storage:
            file_path = os.path.join(self.files_dir, filename)
            with open(file_path, "rb") as f:
                return f.read()
        else:
            file_obj = self.s3.get_object(Bucket=self.s3_bucket_name, Key=filename)
            return file_obj['Body'].read()

    
