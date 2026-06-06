import uuid
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.common import TimestampMixin, UUIDPrimaryKeyMixin


class PromptConfiguration(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = 'prompt_configurations'

    key: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
