"""Дополнительные названия игр для поиска на сайте и в чате.

1) ALIASES — русские названия, народные прозвища, сокращения. Ключ — регулярное выражение по названию игры.
   Добавить своё: допишите строку (r'ЧАСТЬ НАЗВАНИЯ', 'слова через пробел').
2) translit() — автоматически пишет английское название русскими буквами («Wolverine» -> «волверин»),
   чтобы находилось и то, что люди пишут «на слух». Опечатки поиск прощает сам.
"""
import re

ALIASES = [
    # серии и большие франшизы
    (r'GRAND THEFT AUTO|GTA', 'гта гташка gta grand theft auto гранд тефт авто'),
    (r'\bVI\b', '6'), (r'\bV\b(?!R)', '5'), (r'\bIV\b', '4'), (r'\bIII\b', '3'), (r'\bII\b', '2'),
    (r'CALL OF DUTY', 'cod колда колл оф дьюти калл оф дьюти кол оф дюти'),
    (r'MODERN WARFARE', 'мв mw модерн варфейр'), (r'BLACK OPS', 'блэк опс блек опс бо bo'), (r'COLD WAR', 'колд вар холодная война'),
    (r'VANGUARD', 'авангард вангард'), (r'WWII', 'ww2 вторая мировая'),
    (r'SPIDER', 'человек паук человекпаук паук спайдер мен спайдермен spiderman'),
    (r'MILES MORALES', 'майлз моралес майлз'),
    (r'WOLVERINE', 'росомаха расомаха россомаха вулверин волверин логан икс мен'),
    (r'\bFC \d|FIFA', 'фифа fifa фк футбол'),
    (r'MORTAL KOMBAT', 'мортал комбат мк mk'), (r'INJUSTICE', 'инджастис инжастис'),
    (r'RESIDENT EVIL', 'резидент ивел резик обитель зла re biohazard биохазард'),
    (r'VILLAGE', 'виллидж деревня'), (r'REQUIEM', 'реквием'),
    (r'GOD OF WAR', 'год оф вар бог войны гов gow кратос'), (r'RAGNAROK', 'рагнарек рагнарёк'),
    (r'MINECRAFT', 'майнкрафт майн'), (r'RED DEAD', 'рдр rdr ред дед редемпшн дикий запад ковбой'),
    (r'LAST OF US', 'одни из нас зе ласт оф ас тлоу tlou ласт оф ас'),
    (r'ВЕДЬМАК', 'witcher витчер ведьмак геральт'), (r'CYBERPUNK', 'киберпанк кибер'),
    (r'ASSASSIN', 'ассасин ассасинс крид ac'), (r'BLACK FLAG', 'черный флаг чёрный флаг'), (r'VALHALLA', 'вальхалла'),
    (r'ODYSSEY', 'одиссея'), (r'MIRAGE', 'мираж'), (r'SHADOWS(?! DIE)', 'тени'),
    (r'NEED FOR SPEED', 'нфс nfs нид фор спид'), (r'UNBOUND', 'анбаунд'), (r'PAYBACK', 'пейбэк'), (r'\bHEAT\b', 'хит'),
    (r'\bUFC\b', 'юфс бои мма'), (r'HOGWARTS', 'хогвартс гарри поттер поттер'),
    (r'\bNBA\b', 'нба баскетбол'), (r'\bNHL\b', 'нхл хоккей'), (r'MADDEN|NFL', 'мэдден американский футбол'),
    (r'TEKKEN', 'теккен текен'), (r'ELDEN', 'элден ринг'), (r'GRAN TURISMO', 'гран туризмо gt гонки'),
    (r'FAR CRY', 'фар край фаркрай'), (r'BATTLEFIELD', 'батлфилд бф bf батла'),
    (r'HORIZON', 'хорайзон хоризон элой'), (r'UNCHARTED', 'анчартед нейтан дрейк'), (r'DETROIT', 'детройт'),
    (r'SILENT HILL', 'сайлент хилл тихий холм'), (r'DEATH STRANDING', 'дес стрендинг дэс стрэндинг кодзима'),
    (r'GHOST OF TSUSHIMA', 'призрак цусимы гост оф цусима цусима'), (r'GHOST OF YOTEI', 'призрак йотея гост оф йотей йотей'),
    (r'NARUTO', 'наруто'), (r'LEGO', 'лего'), (r'IT TAKES TWO', 'для двоих ит тейкс ту'), (r'SPLIT FICTION', 'сплит фикшн'),
    (r'FORZA', 'форза'), (r'\bDIABLO\b', 'диабло'),
    (r'STAR WARS', 'звёздные войны звездные войны стар варс'), (r'JEDI', 'джедай'), (r'BATTLEFRONT', 'батлфронт'),
    (r'BATMAN', 'бэтмен бетмен'), (r'HITMAN', 'хитман агент 47'), (r'\bMAFIA\b', 'мафия'),
    (r'\bDOOM\b', 'дум'), (r'\bMETRO\b', 'метро'), (r'STALKER', 'сталкер'), (r'\bSIMS\b', 'симс симсы'), (r'WWE', 'реслинг рестлинг'),
    (r'\bF1\b', 'формула 1 ф1 формула'), (r'\bCRASH\b', 'крэш креш бандикут'), (r'SEKIRO', 'секиро'), (r'BLOODBORNE', 'бладборн'),
    (r'DAYS GONE', 'жизнь после дейс гон'), (r'DARK SOULS', 'дарк соулс дарк соулс'), (r"DEMON.S SOULS", 'демон соулс'),
    (r'DYING LIGHT', 'даинг лайт дайн лайт'), (r'FALLOUT', 'фоллаут фалаут'), (r'WATCH DOGS', 'вотч догс ватч догс'),
    (r'SKYRIM|ELDER SCROLLS', 'скайрим древние свитки'), (r'STARFIELD', 'старфилд'),
    (r'TOMB RAIDER', 'томб райдер лара крофт'), (r'INDIANA', 'индиана джонс'), (r'AVATAR', 'аватар пандора'),
    (r'ATOMIC HEART', 'атомик харт атомное сердце'), (r'BLACK MYTH|WUKONG', 'вуконг черный миф чёрный миф'),
    (r'DRAGON.S DOGMA', 'драгонс догма'), (r'DRAGON AGE', 'драгон эйдж'), (r'FINAL FANTASY', 'файнал фэнтези последняя фантазия ff'),
    (r'SUBNAUTICA', 'сабнатика сабнаутика'), (r'DAY Z', 'дейзи дэйзи dayz'), (r'SNOWRUNNER|MUDRUNNER', 'сноураннер мадраннер грузовики бездорожье'),
    (r'CUPHEAD', 'капхед'), (r'A WAY OUT', 'э вей аут'), (r'OVERCOOKED', 'оверкукед повара'), (r'UNRAVEL', 'анравел'),
    (r'LITTLE NIGHTMARES', 'маленькие кошмары литл найтмерс'), (r'\bSTRAY\b', 'стрей котик кот'),
    (r'ТАЧКИ', 'cars тачки молния маккуин'), (r'Черепашки|COWABUNGA', 'tmnt черепашки ниндзя'),
    (r'SNIPER ELITE', 'снайпер элит'), (r'GHOST RECON', 'гост рекон'), (r'\bDIRT\b', 'дирт ралли'), (r'\bWRC\b', 'ралли врк'),
    (r'\bCREW\b', 'зе крю крю'), (r'MOTOGP', 'мотогп мотоциклы'), (r'ASSETTO', 'ассетто корса'), (r'WRECKFEST', 'рекфест'),
    (r'HOT WHEELS', 'хот вилс машинки'), (r'\bSONIC\b', 'соник'), (r'\bRATCHET\b', 'рэтчет и кланк ретчет'),
    (r'\bASTRO\b', 'астро бот'), (r'SACKBOY', 'сэкбой сакбой'), (r'\bKENA\b', 'кена'), (r'RETURNAL', 'ретурнал'),
    (r'SHADOW OF THE COLOSSUS', 'тень колосса'), (r'ALAN WAKE', 'алан вейк'), (r'DEAD SPACE', 'дед спейс мертвый космос'),
    (r'OUTLAST', 'аутласт'), (r'POPPY', 'поппи плейтайм хаги ваги'), (r'HALLOWEEN', 'хэллоуин майкл майерс'),
    (r'NO MAN.S SKY', 'ноу мэнс скай'), (r'AMONG US', 'амонг ас амогус'), (r'PAVLOV', 'павлов'),
    (r'KINGDOM COME', 'кингдом кам'), (r'GOTHIC', 'готика'), (r'\bNIOH\b', 'нио'), (r'LIES OF P', 'лайс оф пи пиноккио'),
    (r'HOLLOW KNIGHT', 'холлоу найт силксонг'), (r'\bHADES\b', 'хейдес аид'), (r'\bSIFU\b', 'сифу'),
    (r'ROBOCOP', 'робокоп'), (r'BORDERLANDS', 'бордерлендс'), (r'WOLFENSTEIN', 'вольфенштейн'), (r'CRYSIS', 'крайзис'),
    (r'FROSTPUNK', 'фростпанк'), (r'\bARK\b', 'арк динозавры'), (r'JURASSIC', 'юрского периода динозавры'),
    (r'\bRUST\b', 'раст'), (r'\bFOREST\b', 'форест лес'), (r'MONOPOLY', 'монополия'), (r'PLANTS VS', 'растения против зомби'),
    (r'SMURFS', 'смурфики'), (r'WALL-E', 'валли'), (r'CARX', 'каркс дрифт'), (r'\bHUNT\b', 'хант'),
    (r'NINJA GAIDEN', 'ниндзя гайден'), (r'ONIMUSHA', 'онимуша'), (r'PHANTOM BLADE', 'фантом блейд'),
    (r'RISE OF THE RONIN', 'ронин'), (r'GUARDIANS OF THE GALAXY', 'стражи галактики'), (r'INVINCIBLE', 'неуязвимый инвинсибл'),
    (r'METAL GEAR', 'метал гир снейк'), (r'\bHALO\b', 'хало мастер чиф'), (r'\bDUNE\b', 'дюна'), (r'ACE COMBAT', 'эйс комбат самолеты'),
    (r'ACES OF THUNDER', 'самолеты'), (r'007', 'джеймс бонд бонд'), (r'CRIMSON DESERT', 'кримсон дезерт'),
    (r'PRAGMATA', 'прагмата'), (r'SAROS', 'сарос'), (r'BLOODLINES', 'вампиры маскарад бладлайнс'),
    (r'PATHOLOGIC', 'мор утопия патолоджик'), (r'TRAIL OUT', 'трейл аут'), (r'SERIOUS SAM', 'серьезный сэм серьёзный сэм'),
    (r'PAINKILLER', 'пейнкиллер'), (r'GHOSTRUNNER', 'гостраннер'), (r'AGE OF EMPIRES', 'эпоха империй'),
    (r'\bANNO\b', 'анно'), (r'SURVIVING MARS', 'марс'), (r'BLACK DESERT', 'блэк дезерт'), (r'UNDISPUTED', 'бокс'),
    (r'\bCREED\b', 'крид бокс'), (r'JOB SIMULATOR', 'симулятор работы'), (r'\bMOSS\b', 'мосс мышка'),
    (r'BEAT THE BEATS', 'ритм'), (r'GROUNDED', 'граундед'), (r'ASTRONEER', 'астронир'), (r'NASCAR', 'наскар'),
    (r'ARC RAIDERS', 'арк рейдерс'), (r'MORTAL SHELL', 'мортал шелл'), (r'HIGH ON LIFE', 'хай он лайф'),
    (r'DIRECTIVE 8020', 'директива'), (r'FORT SOLIS', 'форт солис'), (r'REANIMAL', 'реанимал'), (r'DOCKED', 'порт'),
    (r'SINKING CITY', 'тонущий город'), (r'BROTHERS', 'братья'), (r'TEAM SONIC', 'соник гонки'),
    (r'LIMBO|INSIDE', 'лимбо инсайд'), (r'MOVING OUT', 'переезд'), (r'DON.T STARVE', 'донт старв'),
    (r'RAYMAN', 'рэйман'), (r'EXPEDITIONS', 'экспедиции'), (r'HELL LET LOOSE', 'хелл лет лус вьетнам'),
    (r'GALACTIC RACER', 'гонки'), (r'\bPETS\b', 'питомцы'), (r'TENNIS', 'теннис'), (r'STRIDE', 'паркур'),
    (r'CYUBEVR', 'кубы'), (r'MISTFALL', 'мистфолл'), (r'BEAST OF', 'зверь'), (r'\bMOUSE\b', 'мышь'),
    (r'BLOOD OF DAWNWALKER', 'даунвокер'), (r'PLAGUE TALE', 'чумная сказка плейг тейл'), (r'TOKON', 'токон'),
    (r'ADORABLE', 'приключения'), (r'APHELION', 'афелион'), (r'\bALTERS\b', 'альтерс'), (r'WAY OF THE HUNTER', 'охота охотник'),
    (r'VOYAGERS', 'путешественники'),
]

_PAIRS = [('sch', 'ш'), ('sh', 'ш'), ('ch', 'ч'), ('zh', 'ж'), ('kh', 'х'), ('ph', 'ф'), ('th', 'т'), ('ck', 'к'), ('qu', 'кв'),
          ('ee', 'и'), ('ea', 'и'), ('oo', 'у'), ('ou', 'ау'), ('ai', 'эй'), ('ay', 'эй'), ('ey', 'и'), ('oy', 'ой'), ('ow', 'оу'),
          ('tion', 'шн'), ('ture', 'чер'), ('ie', 'и'), ('ge', 'дж'), ('gi', 'джи'), ('ce', 'се'), ('ci', 'си'), ('cy', 'си')]
_ONE = {'a': 'а', 'b': 'б', 'c': 'к', 'd': 'д', 'e': 'е', 'f': 'ф', 'g': 'г', 'h': 'х', 'i': 'и', 'j': 'дж', 'k': 'к', 'l': 'л',
        'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'q': 'к', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у', 'v': 'в', 'w': 'в', 'x': 'кс',
        'y': 'и', 'z': 'з'}


def translit(title):
    """Английское название русскими буквами, как его произносят: WOLVERINE -> волверин."""
    out = []
    for word in re.findall(r'[a-z]+', title.lower()):
        if len(word) < 3:
            continue
        w = re.sub(r'e$', '', word) if len(word) > 3 else word  # немая e на конце: wolverine -> wolverin
        res, i = '', 0
        while i < len(w):
            for a, b in sorted(_PAIRS, key=lambda p: -len(p[0])):
                if w.startswith(a, i):
                    res += b
                    i += len(a)
                    break
            else:
                res += _ONE.get(w[i], '')
                i += 1
        out.append(res)
    return ' '.join(out)


def search_words(title):
    extra = ' '.join(w for rx, w in ALIASES if re.search(rx, title, re.I))
    return f'{title} {extra} {translit(title)}'
