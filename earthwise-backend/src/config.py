from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    upload_dir: str = "./uploads"
    database_url: str = "sqlite:///./earthwise.db"
    port: int = 8000
    max_upload_size_mb: int = 10
    max_uploads_per_session: int = 5
    pages_per_llm_chunk: int = 8

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def upload_path(self) -> Path:
        p = Path(self.upload_dir)
        p.mkdir(parents=True, exist_ok=True)
        return p


settings = Settings()
