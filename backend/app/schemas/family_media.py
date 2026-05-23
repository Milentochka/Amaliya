from typing import Literal

from pydantic import BaseModel


class FamilyMediaOut(BaseModel):
    id: int
    kind: Literal["photo", "video"]
    filename: str
    url: str
    order_index: int


class FamilyMediaReorderIn(BaseModel):
    ids: list[int]  # new order, must contain every existing media id
