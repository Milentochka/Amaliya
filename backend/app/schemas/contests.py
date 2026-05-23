"""Pydantic schemas for contest endpoints."""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel


class ContestStateOut(BaseModel):
    contest_id: int
    status: Literal["not_started", "active", "closed"]
    active_step: Dict[str, Any] = {}


class ContestStatusIn(BaseModel):
    status: Literal["not_started", "active", "closed"]


class RelativeVote(BaseModel):
    name: str
    count: int


class Contest1TraitOut(BaseModel):
    id: int
    order_index: int
    name: str
    votes_mom: int
    votes_dad: int
    votes_unique: int
    votes_relatives: List[RelativeVote] = []


class Contest1Summary(BaseModel):
    totals: Dict[str, int]
    top_relative_name: Optional[str] = None
    top_relative_count: int = 0
    verdict: Optional[str] = None


class Contest1Overview(BaseModel):
    state: ContestStateOut
    traits: List[Contest1TraitOut]
    summary: Contest1Summary


class Contest1TallyIn(BaseModel):
    votes_mom: Optional[int] = None
    votes_dad: Optional[int] = None
    votes_unique: Optional[int] = None
    votes_relatives: Optional[List[RelativeVote]] = None


class Contest1StageIn(BaseModel):
    stage: Literal[1, 2, 3]


# -------- Contest 2 --------


class Contest2QuestionOut(BaseModel):
    id: int
    order_index: int
    text: str
    options: List[str]
    correct_index: Optional[int] = None
    first_correct_name: Optional[str] = None
    first_correct_guest_id: Optional[str] = None


class Contest2LeaderRow(BaseModel):
    name: str
    wins: int


class Contest2Overview(BaseModel):
    state: ContestStateOut
    questions: List[Contest2QuestionOut]
    leaderboard: List[Contest2LeaderRow]
    winner_name: Optional[str] = None
    answered: int
    total: int


class Contest2ActiveIn(BaseModel):
    question_id: Optional[int] = None
    show_answer: bool = False


class Contest2FirstCorrectIn(BaseModel):
    guest_id: Optional[str] = None
    guest_name: Optional[str] = None


# -------- Contest 3 --------


class Contest3Stats(BaseModel):
    state: ContestStateOut
    total_promises: int
    assigned_total: int
    read_total: int
    guests_total: int
    guests_with_assignments: int
    guests_done: int


class Contest3AssignIn(BaseModel):
    per_guest: int = 2


class Contest3PromiseView(BaseModel):
    id: int
    text: str
    read_aloud_at: Optional[str] = None


class Contest3CurrentGuest(BaseModel):
    guest_id: str
    guest_name: str
    avatar_url: str
    avatar_name: str
    promises: List[Contest3PromiseView]


class Contest3ProjectorView(BaseModel):
    state: ContestStateOut
    current: Optional[Contest3CurrentGuest] = None


class Contest3MarkReadIn(BaseModel):
    promise_ids: List[int]


# -------- Contest 4 --------


class Contest4Trait(BaseModel):
    order_index: int
    text: str


class Contest4GuestRef(BaseModel):
    id: str
    name: str
    avatar_url: str
    avatar_name: str


class Contest4Zodiac(BaseModel):
    key: str
    name: str
    glyph: str
    traits: List[Contest4Trait]
    guests: List[Contest4GuestRef]


class Contest4Overview(BaseModel):
    state: ContestStateOut
    zodiacs: List[Contest4Zodiac]


class Contest4CurrentZodiac(BaseModel):
    key: str
    name: str
    glyph: str
    traits: List[Contest4Trait]
    selected_trait_indices: List[int] = []
    guests: List[Contest4GuestRef]


class Contest4ProjectorView(BaseModel):
    state: ContestStateOut
    current: Optional[Contest4CurrentZodiac] = None


class Contest4ActiveIn(BaseModel):
    zodiac_key: Optional[str] = None


class Contest4TraitToggleIn(BaseModel):
    order_index: int


# -------- Contest 5 «Своя игра» --------


class Contest5QuestionCell(BaseModel):
    id: int
    value: int
    answered_status: str
    answered_team_id: Optional[int] = None
    text: Optional[str] = None
    answer: Optional[str] = None
    image_key: Optional[str] = None
    answer_image_key: Optional[str] = None


class Contest5CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    order_index: int
    questions: List[Contest5QuestionCell]


class Contest5TeamOut(BaseModel):
    id: int
    name: str
    color: str
    score: int
    final_wager: int
    final_correct: Optional[bool] = None
    order_index: int


class Contest5FinalOut(BaseModel):
    text: Optional[str] = None
    answer: Optional[str] = None
    revealed: bool


class Contest5Overview(BaseModel):
    state: ContestStateOut
    categories: List[Contest5CategoryOut]
    teams: List[Contest5TeamOut]
    final: Optional[Contest5FinalOut] = None


class Contest5ActiveQuestion(BaseModel):
    id: int
    category_name: str
    value: int
    text: str
    answer: Optional[str] = None
    image_key: Optional[str] = None
    answer_image_key: Optional[str] = None


class Contest5ProjectorOut(Contest5Overview):
    active_question: Optional[Contest5ActiveQuestion] = None
    final_active: bool = False
    final_question: Optional[Contest5FinalOut] = None


class Contest5OpenIn(BaseModel):
    question_id: int


class Contest5ResolveIn(BaseModel):
    question_id: int
    team_id: Optional[int] = None
    correct: bool = False


class Contest5TeamUpdateIn(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    score: Optional[int] = None
    final_wager: Optional[int] = None
    final_correct: Optional[bool] = None
