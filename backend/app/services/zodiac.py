"""Western zodiac (by day+month) and Chinese zodiac (by lunar new year)."""

from datetime import date

# (sign_start, sign_end_inclusive, name)
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

# Chinese 12-year cycle anchored at 1900 = Крыса.
_CHINESE_BASE_YEAR = 1900
_CHINESE_ANIMALS = [
    "Крыса", "Бык", "Тигр", "Кролик", "Дракон", "Змея",
    "Лошадь", "Коза", "Обезьяна", "Петух", "Собака", "Свинья",
]

# Chinese (lunar) New Year date per Gregorian year. The animal of a given
# Gregorian year only applies *from* this date onwards; dates before this
# date in the same Gregorian year fall under the previous year's animal.
# Source: standard reference tables. Covers 1940–2026 (our DOB diapason).
_CHINESE_NEW_YEAR: dict = {
    1940: (2, 8),  1941: (1, 27), 1942: (2, 15), 1943: (2, 5),  1944: (1, 25),
    1945: (2, 13), 1946: (2, 2),  1947: (1, 22), 1948: (2, 10), 1949: (1, 29),
    1950: (2, 17), 1951: (2, 6),  1952: (1, 27), 1953: (2, 14), 1954: (2, 3),
    1955: (1, 24), 1956: (2, 12), 1957: (1, 31), 1958: (2, 18), 1959: (2, 8),
    1960: (1, 28), 1961: (2, 15), 1962: (2, 5),  1963: (1, 25), 1964: (2, 13),
    1965: (2, 2),  1966: (1, 21), 1967: (2, 9),  1968: (1, 30), 1969: (2, 17),
    1970: (2, 6),  1971: (1, 27), 1972: (2, 15), 1973: (2, 3),  1974: (1, 23),
    1975: (2, 11), 1976: (1, 31), 1977: (2, 18), 1978: (2, 7),  1979: (1, 28),
    1980: (2, 16), 1981: (2, 5),  1982: (1, 25), 1983: (2, 13), 1984: (2, 2),
    1985: (2, 20), 1986: (2, 9),  1987: (1, 29), 1988: (2, 17), 1989: (2, 6),
    1990: (1, 27), 1991: (2, 15), 1992: (2, 4),  1993: (1, 23), 1994: (2, 10),
    1995: (1, 31), 1996: (2, 19), 1997: (2, 7),  1998: (1, 28), 1999: (2, 16),
    2000: (2, 5),  2001: (1, 24), 2002: (2, 12), 2003: (2, 1),  2004: (1, 22),
    2005: (2, 9),  2006: (1, 29), 2007: (2, 18), 2008: (2, 7),  2009: (1, 26),
    2010: (2, 14), 2011: (2, 3),  2012: (1, 23), 2013: (2, 10), 2014: (1, 31),
    2015: (2, 19), 2016: (2, 8),  2017: (1, 28), 2018: (2, 16), 2019: (2, 5),
    2020: (1, 25), 2021: (2, 12), 2022: (2, 1),  2023: (1, 22), 2024: (2, 10),
    2025: (1, 29), 2026: (2, 17),
}


def western_zodiac(d: date) -> str:
    md = (d.month, d.day)
    for (s_m, s_d), (e_m, e_d), name in _WESTERN:
        if (s_m, s_d) <= md <= (e_m, e_d):
            return name
    return "—"  # unreachable


def chinese_zodiac(d: date) -> str:
    """Returns the Chinese zodiac animal honoring the lunar new year,
    not the Gregorian calendar year.
    """
    cny = _CHINESE_NEW_YEAR.get(d.year)
    if cny is None:
        # Years outside our diapason — fallback to mid-range Feb 4.
        cny = (2, 4)
    if (d.month, d.day) < cny:
        year = d.year - 1
    else:
        year = d.year
    return _CHINESE_ANIMALS[(year - _CHINESE_BASE_YEAR) % 12]
