"""Western zodiac (by day+month) and Chinese zodiac (by year)."""

from datetime import date

# (sign, last day of sign in this month, name) — boundaries inclusive of "from"
_WESTERN: list = [
    ((1, 1), (1, 19), "Козерог"),
    ((1, 20), (2, 18), "Водолей"),
    ((2, 19), (3, 20), "Рыбы"),
    ((3, 21), (4, 19), "Овен"),
    ((4, 20), (5, 20), "Телец"),
    ((5, 21), (6, 20), "Близнецы"),
    ((6, 21), (7, 22), "Рак"),
    ((7, 23), (8, 22), "Лев"),
    ((8, 23), (9, 22), "Дева"),
    ((9, 23), (10, 22), "Весы"),
    ((10, 23), (11, 21), "Скорпион"),
    ((11, 22), (12, 21), "Стрелец"),
    ((12, 22), (12, 31), "Козерог"),
]

_CHINESE_BASE_YEAR = 1900  # 1900 = Крыса
_CHINESE_ANIMALS = [
    "Крыса", "Бык", "Тигр", "Кролик", "Дракон", "Змея",
    "Лошадь", "Коза", "Обезьяна", "Петух", "Собака", "Свинья",
]


def western_zodiac(d: date) -> str:
    md = (d.month, d.day)
    for (s_m, s_d), (e_m, e_d), name in _WESTERN:
        if (s_m, s_d) <= md <= (e_m, e_d):
            return name
    return "—"  # unreachable


def chinese_zodiac(year: int) -> str:
    return _CHINESE_ANIMALS[(year - _CHINESE_BASE_YEAR) % 12]
