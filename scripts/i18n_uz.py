"""Узбекская версия сайта (латиница). Русский текст -> узбекский.

Перевод делается при сборке: scripts/build.py берёт готовую русскую страницу и заменяет тексты.
Чтобы поправить перевод — измените строку справа. Названия игр и отзывы клиентов не переводим.
"""
import re

# Полные тексты (совпадение всей строки/фразы)
UZ = {
    # шапка, меню, подвал
    'PS SHOP — игры для PS4 и PS5 в Ташкенте': 'PS SHOP — Toshkentda PS4 va PS5 uchun o‘yinlar',
    'К содержимому': 'Asosiy qismga o‘tish',
    'Каталог': 'Katalog',
    'Подписки': 'Obunalar',
    'Аренда PS5': 'PS5 ijarasi',
    'Установка': 'O‘rnatish',
    'Отзывы': 'Fikrlar',
    'Акции': 'Aksiyalar',
    'О нас': 'Biz haqimizda',
    'PS SHOP — на главную': 'PS SHOP — bosh sahifa',
    'Разделы': 'Bo‘limlar',
    'Найти игру': 'O‘yin qidirish',
    'Поиск': 'Qidiruv',
    'Корзина': 'Savat',
    'Закрыть': 'Yopish',
    'Магазин': 'Do‘kon',
    'Каталог игр': 'O‘yinlar katalogi',
    'Подписки PS Plus и EA Play': 'PS Plus va EA Play obunalari',
    'Как происходит установка': 'O‘rnatish qanday bo‘ladi',
    'Связь': 'Aloqa',
    'По всем вопросам': 'Barcha savollar bo‘yicha',
    'Telegram-канал': 'Telegram-kanal',
    'Сообщество игроков': 'O‘yinchilar hamjamiyati',
    'Цифровые игры и подписки для PlayStation 4 и PlayStation 5 в Ташкенте. Работаем более 3 лет. На связи 24/7.':
        'Toshkentda PlayStation 4 va PlayStation 5 uchun raqamli o‘yinlar va obunalar. 3 yildan ortiq ishlayapmiz. 24/7 aloqadamiz.',
    'PS SHOP — независимый магазин. PlayStation, PS4 и PS5 — товарные знаки их владельцев.':
        'PS SHOP — mustaqil do‘kon. PlayStation, PS4 va PS5 — o‘z egalarining savdo belgilari.',
    'Главная': 'Bosh sahifa',
    'Навигация': 'Navigatsiya',
    # главная
    'Предзаказ': 'Oldindan buyurtma',
    'Выход 19 ноября': '19-noyabrda chiqadi',
    'Джейсон, Люсия и Вайс-Сити. Оформите заранее, и в день релиза игра уже будет на вашей консоли.':
        'Jeyson, Lyusiya va Vays-Siti. Oldindan rasmiylashtiring — chiqqan kuniyoq o‘yin konsolingizda bo‘ladi.',
    'дней': 'kun', 'часов': 'soat', 'минут': 'daqiqa', 'секунд': 'soniya',
    'GTA 6 уже вышла': 'GTA 6 allaqachon chiqdi',
    'Оформить': 'Rasmiylashtirish',
    'Наши клиенты заходят в игру 18 ноября в 23:30.': 'Mijozlarimiz o‘yinga 18-noyabr soat 23:30 da kirishadi.',
    'До выхода GTA 6': 'GTA 6 chiqishigacha',
    'Подбросить геймпад': 'Geympadni otish',
    'Почему PS SHOP': 'Nega PS SHOP',
    'Подключим дистанционно': 'Masofadan ulab beramiz',
    'Консоль никуда везти не нужно': 'Konsolni hech qayerga olib borish shart emas',
    'Гарантия': 'Kafolat',
    'Работоспособность, замена или возврат': 'Ishlashi, almashtirish yoki pulni qaytarish',
    'На связи 24/7': '24/7 aloqadamiz',
    'Поможем и после покупки': 'Xariddan keyin ham yordam beramiz',
    'Для PS4 и PS5': 'PS4 va PS5 uchun',
    'Хиты': 'Xitlar', 'Хит': 'Xit',
    'Смотреть все': 'Hammasini ko‘rish',
    'от': 'dan',
    'Новинки': 'Yangiliklar', 'Новинка': 'Yangi',
    'Акция': 'Aksiya',
    'Предзаказы': 'Oldindan buyurtmalar',
    'Сотни игр по подписке, онлайн с друзьями и облачные сохранения. Есть EA Play.':
        'Obuna bo‘yicha yuzlab o‘yinlar, do‘stlar bilan onlayn va bulutli saqlash. EA Play ham bor.',
    'uzs / месяц': 'uzs / oy',
    'Выбрать подписку': 'Obunani tanlash',
    'Привезём консоль с двумя джойстиками, установим и настроим у вас дома в Ташкенте.':
        'Konsolni ikkita joystik bilan olib kelamiz, Toshkentda uyingizda o‘rnatib, sozlab beramiz.',
    'uzs / сутки': 'uzs / sutka',
    'Смотреть цены': 'Narxlarni ko‘rish',
    'Играть вместе': 'Birga o‘ynash',
    'До 200 000 uzs': '200 000 uzs gacha',
    'Все отзывы': 'Barcha fikrlar',
    'Для VR': 'VR uchun',
    'Доп. услуги': 'Qo‘shimcha xizmatlar',
    'Чистка консоли': 'Konsolni tozalash',
    'Почистим вашу PS4 или PS5. Стоимость и сроки подскажем в Telegram.': 'PS4 yoki PS5 ingizni tozalab beramiz. Narxi va muddatini Telegramda aytamiz.',
    'Узнать цену': 'Narxini bilish',
    'Аксессуары': 'Aksessuarlar',
    'Поможем подобрать аксессуары для PlayStation. Наличие и цены — в Telegram.': 'PlayStation uchun aksessuar tanlashga yordam beramiz. Bor-yo‘qligi va narxlari — Telegramda.',
    'Гарантии': 'Kafolatlar',
    'Отзывы клиентов': 'Mijozlar fikrlari',
    'Игра работает': 'O‘yin ishlaydi',
    'Игра запустится и будет работать. Если что-то пойдёт не так, разберёмся сразу, а не «когда-нибудь».':
        'O‘yin ishga tushadi va ishlaydi. Biror narsa chiqsa, «qachondir» emas, darhol hal qilamiz.',
    'Замена или возврат': 'Almashtirish yoki qaytarish',
    'Если проблему не получилось решить, заменим игру или вернём деньги. Без долгих споров.':
        'Muammoni hal qilib bo‘lmasa, o‘yinni almashtiramiz yoki pulni qaytaramiz. Uzoq bahslarsiz.',
    'Аккаунт в безопасности': 'Akkaunt xavfsiz',
    'Игра ставится через отдельного пользователя на консоли. Ваш личный профиль и данные остаются нетронутыми.':
        'O‘yin konsoldagi alohida foydalanuvchi orqali o‘rnatiladi. Shaxsiy profilingiz va ma’lumotlaringizga tegilmaydi.',
    'Понятная инструкция': 'Tushunarli yo‘riqnoma',
    'Пришлём подробную пошаговую инструкцию. Справится даже тот, кто впервые держит джойстик.':
        'Batafsil qadam-baqadam yo‘riqnoma yuboramiz. Joystikni birinchi marta ushlagan odam ham uddalaydi.',
    'Не пропадаем после оплаты. Пишите в любое время: подскажем, поможем, быстро решим.':
        'To‘lovdan keyin yo‘qolib qolmaymiz. Istalgan vaqtda yozing: maslahat beramiz, yordam beramiz, tez hal qilamiz.',
    # чат
    'Помощник': 'Yordamchi',
    'Помощник PS SHOP': 'PS SHOP yordamchisi',
    'Открыть чат-помощник': 'Chat-yordamchini ochish',
    'Чат-помощник PS SHOP': 'PS SHOP chat-yordamchisi',
    'Закрыть чат': 'Chatni yopish',
    'Сообщение': 'Xabar',
    'Название игры или вопрос': 'O‘yin nomi yoki savol',
    'Отправить': 'Yuborish',
    # каталог
    'Каталог игр для PS4 и PS5 — PS SHOP': 'PS4 va PS5 uchun o‘yinlar katalogi — PS SHOP',
    'Все игры из нашего канала с актуальными ценами для PS4 и PS5.': 'Kanalimizdagi barcha o‘yinlar, PS4 va PS5 uchun dolzarb narxlar bilan.',
    'Все': 'Hammasi',
    'Русская озвучка': 'Rus tilida ovoz',
    'На русском': 'Rus tilida',
    'Для компании': 'Kompaniya uchun',
    'Сортировка': 'Saralash',
    'Сначала новые': 'Avval yangilari',
    'Сначала дешевле': 'Avval arzonlari',
    'Сначала дороже': 'Avval qimmatlari',
    'По алфавиту': 'Alifbo bo‘yicha',
    'Фильтры': 'Filtrlar',
    'Не нашли нужную игру?': 'Kerakli o‘yinni topmadingizmi?',
    'Напишите нам, найдём за 10 минут.': 'Bizga yozing, 10 daqiqada topamiz.',
    'Написать в Telegram': 'Telegramga yozish',
    'Показать ещё': 'Yana ko‘rsatish',
    # подписки
    'Подписки PS Plus и EA Play в Ташкенте — PS SHOP': 'Toshkentda PS Plus va EA Play obunalari — PS SHOP',
    'PS Plus для PS4 и PS5 и EA Play. Подписка на 12 месяцев выходит выгоднее всего: один раз оформили и играете весь год.':
        'PS4 va PS5 uchun PS Plus hamda EA Play. 12 oylik obuna eng foydalisi: bir marta rasmiylashtirasiz — yil bo‘yi o‘ynaysiz.',
    'Онлайн-игры с друзьями, ежемесячные игры и облачные сохранения.': 'Do‘stlar bilan onlayn o‘yinlar, har oylik o‘yinlar va bulutli saqlash.',
    '1 месяц': '1 oy', '3 месяца': '3 oy', '12 месяцев': '12 oy',
    'В корзину': 'Savatga',
    'В корзине': 'Savatda',
    'Выгоднее всего': 'Eng foydali',
    'Всё из Essential и каталог из сотен игр для PS4 и PS5.': 'Essential dagi hammasi va PS4, PS5 uchun yuzlab o‘yinlar katalogi.',
    'Всё из Extra, классические игры и пробные версии новинок.': 'Extra dagi hammasi, klassik o‘yinlar va yangiliklarning sinov versiyalari.',
    'Что входит': 'Nimalar kiradi',
    'Большая коллекция игр EA: спорт, гонки, экшен и кооператив.': 'EA o‘yinlarining katta to‘plami: sport, poyga, ekshn va kooperativ.',
    'Полный список на сайте EA': 'To‘liq ro‘yxat EA saytida',
    'Подписки оформляются так же, как игры: добавьте в корзину и отправьте заявку. Подключим дистанционно.':
        'Obunalar ham o‘yinlar kabi rasmiylashtiriladi: savatga qo‘shing va ariza yuboring. Masofadan ulab beramiz.',
    'PS Plus Essential, Extra и Deluxe (Premium) на 1, 3 и 12 месяцев, EA Play. Цены в сумах, подключим дистанционно.':
        'PS Plus Essential, Extra va Deluxe (Premium) 1, 3 va 12 oyga, EA Play. Narxlar so‘mda, masofadan ulab beramiz.',
    # аренда
    'Аренда PS5 в Ташкенте — PS SHOP': 'Toshkentda PS5 ijarasi — PS SHOP',
    'Привезём PlayStation 5, установим и настроим у вас дома. Отлично для вечера с друзьями или турнира в FC.':
        'PlayStation 5 ni olib kelamiz, uyingizda o‘rnatib, sozlab beramiz. Do‘stlar bilan kechaga yoki FC turniriga zo‘r.',
    'Забронировать в Telegram': 'Telegramda band qilish',
    'Группа аренды @psshop_arenda': 'Ijara guruhi @psshop_arenda',
    'PlayStation 5 и 2 джойстика: играйте вдвоём': 'PlayStation 5 va 2 ta joystik: ikki kishi o‘ynang',
    'Игры по подписке PS Plus': 'PS Plus obunasidagi o‘yinlar',
    'Доставка по Ташкенту': 'Toshkent bo‘ylab yetkazib berish',
    'Установка и настройка у вас дома': 'Uyingizda o‘rnatish va sozlash',
    'Прокат': 'Ijara', 'сутки': 'sutka', 'суток': 'sutka',
    'Продление': 'Uzaytirish',
    'Бронирование': 'Band qilish',
    'Чтобы забронировать консоль, внесите предоплату': 'Konsolni band qilish uchun oldindan to‘lov qiling',
    'Вы вносите предоплату 50 000 uzs': 'Siz 50 000 uzs oldindan to‘laysiz',
    'Мы бронируем консоль за вами': 'Konsolni siz uchun band qilamiz',
    'Готовим консоль для вас': 'Konsolni siz uchun tayyorlaymiz',
    'Аренда PlayStation 5 в Ташкенте: от 200 000 uzs в сутки, доставка, установка и настройка дома.':
        'Toshkentda PlayStation 5 ijarasi: sutkasiga 200 000 uzs dan, yetkazib berish, uyda o‘rnatish va sozlash.',
    # установка
    'Как происходит установка игры — PS SHOP': 'O‘yin qanday o‘rnatiladi — PS SHOP',
    'Пять простых шагов, и игра на вашей консоли. Приезжать никуда не нужно, а если запутаетесь, проведём за руку.':
        'Beshta oddiy qadam — va o‘yin konsolingizda. Hech qayerga borish shart emas, adashsangiz, qo‘lingizdan ushlab o‘tkazamiz.',
    'Получаете данные аккаунта': 'Akkaunt ma’lumotlarini olasiz',
    'После оплаты пришлём логин и пароль от аккаунта с игрой, плюс подробную инструкцию.':
        'To‘lovdan keyin o‘yinli akkauntning login va parolini, yana batafsil yo‘riqnoma yuboramiz.',
    'Добавляете нового пользователя': 'Yangi foydalanuvchi qo‘shasiz',
    'На PlayStation выберите «Добавить пользователя» и войдите с нашими данными. Ваш аккаунт остаётся на месте: на одной консоли помещается до 16 аккаунтов.':
        'PlayStation da «Foydalanuvchi qo‘shish» ni tanlang va bizning ma’lumotlar bilan kiring. Akkauntingiz joyida qoladi: bitta konsolda 16 tagacha akkaunt sig‘adi.',
    'Открываете Библиотеку': 'Kutubxonani ochasiz',
    'Войдите в новый профиль и откройте «Библиотеку». Игра уже ждёт там.': 'Yangi profilga kiring va «Kutubxona» ni oching. O‘yin o‘sha yerda kutyapti.',
    'Устанавливаете и играете': 'O‘rnatasiz va o‘ynaysiz',
    'Нажмите «Загрузить», дождитесь окончания установки и запускайте игру.': '«Yuklab olish» ni bosing, o‘rnatish tugashini kuting va o‘yinni ishga tushiring.',
    'Мы рядом на каждом шаге': 'Har bir qadamda yoningizdamiz',
    'Если что-то непонятно, пишите в Telegram: подскажем по шагам или подключим дистанционно. Всё под ключ.':
        'Biror narsa tushunarsiz bo‘lsa, Telegramga yozing: qadam-baqadam tushuntiramiz yoki masofadan ulab beramiz. Hammasi tayyor holda.',
    'Выбрать игру': 'O‘yin tanlash',
    'Задать вопрос в Telegram': 'Telegramda savol berish',
    'Как установить игру из PS SHOP на PS4 или PS5: пять простых шагов, инструкция и поддержка 24/7.':
        'PS SHOP dan o‘yinni PS4 yoki PS5 ga qanday o‘rnatish: beshta oddiy qadam, yo‘riqnoma va 24/7 yordam.',
    # отзывы
    'Отзывы клиентов — PS SHOP': 'Mijozlar fikrlari — PS SHOP',
    'Что пишут наши клиенты. Ещё сотни отзывов — в нашей группе в Telegram.': 'Mijozlarimiz nima yozishadi. Yana yuzlab fikrlar — Telegramdagi guruhimizda.',
    'Все отзывы в Telegram': 'Barcha fikrlar Telegramda',
    'Отзывы клиентов PS SHOP о покупке игр и подписок для PS4 и PS5 в Ташкенте.': 'Toshkentda PS4 va PS5 uchun o‘yin va obuna xaridi haqida PS SHOP mijozlari fikrlari.',
    'Отзыв в Telegram': 'Telegramdagi fikr',
    # о нас
    'О нас — PS SHOP': 'Biz haqimizda — PS SHOP',
    'Привет! Мы — PS SHOP, и мы такое же сообщество игроков, как и вы. Всё началось с простой мысли: в Ташкенте купить игру для PlayStation должно быть так же легко, как включить консоль. Без поездок по городу, переплат и сомнений, заработает ли.':
        'Salom! Biz — PS SHOP, va biz ham xuddi siz kabi o‘yinchilar hamjamiyatimiz. Hammasi oddiy fikrdan boshlangan: Toshkentda PlayStation uchun o‘yin sotib olish konsolni yoqishdek oson bo‘lishi kerak. Shahar bo‘ylab yurishlarsiz, ortiqcha to‘lovlarsiz va «ishlarmikan?» degan shubhalarsiz.',
    'Мы работаем уже более 3 лет. За это время через нас прошли сотни игр и подписок, и за каждой стоит конкретный человек: кто-то собирал друзей на вечер FC, кто-то покупал первую игру ребёнку, кто-то наконец добрался до игры, о которой давно мечтал. Для нас нет «маленьких» заказов — мы ценим каждого клиента и помним, что вы выбрали нас.':
        'Biz 3 yildan ortiq ishlayapmiz. Shu vaqt ichida qo‘limizdan yuzlab o‘yin va obunalar o‘tdi, har birining ortida aniq bir inson turibdi: kimdir do‘stlarini FC kechasiga yig‘gan, kimdir farzandiga birinchi o‘yinini olgan, kimdir nihoyat uzoq orzu qilgan o‘yiniga yetgan. Biz uchun «kichik» buyurtma yo‘q — har bir mijozni qadrlaymiz va bizni tanlaganingizni unutmaymiz.',
    'Мы на связи 24/7 и не пропадаем после оплаты: поможем с установкой, подскажем, решим любой вопрос. А если у вас есть идея, как сделать PS SHOP лучше, — пишите, мы всегда открыты к предложениям.':
        'Biz 24/7 aloqadamiz va to‘lovdan keyin yo‘qolib qolmaymiz: o‘rnatishda yordam beramiz, maslahat beramiz, har qanday savolni hal qilamiz. PS SHOP ni yanada yaxshi qilish bo‘yicha g‘oyangiz bo‘lsa — yozing, takliflarga doim ochiqmiz.',
    'Спасибо, что вы с нами. Увидимся в игре!': 'Biz bilan ekaningiz uchun rahmat. O‘yinda ko‘rishamiz!',
    'Основатель и CEO — Наиль Гайнуллин': 'Asoschi va CEO — Nail Gaynullin',
    'Написать нам': 'Bizga yozish',
    'Сообщество игроков в Telegram': 'Telegramdagi o‘yinchilar hamjamiyati',
    'PS SHOP — сообщество игроков из Ташкента. Цифровые игры и подписки для PS4 и PS5, работаем более 3 лет.':
        'PS SHOP — Toshkentdagi o‘yinchilar hamjamiyati. PS4 va PS5 uchun raqamli o‘yinlar va obunalar, 3 yildan ortiq ishlayapmiz.',
    # акции
    'Акции и скидки на игры PS4 и PS5 — PS SHOP': 'PS4 va PS5 o‘yinlariga aksiya va chegirmalar — PS SHOP',
    'Скидки из нашего Telegram-канала. Когда акция заканчивается, снова действует обычная цена.':
        'Telegram-kanalimizdagi chegirmalar. Aksiya tugagach, yana odatiy narx amal qiladi.',
    'Акция завершилась': 'Aksiya tugadi',
    'Пост в канале': 'Kanaldagi post',
    'Скидки и акции на игры для PlayStation 4 и 5 в PS SHOP.': 'PS SHOP da PlayStation 4 va 5 o‘yinlariga chegirma va aksiyalar.',
    'Сейчас акций нет': 'Hozir aksiyalar yo‘q',
    'Следите за каналом: скидки появляются там первыми.': 'Kanalni kuzatib boring: chegirmalar birinchi bo‘lib o‘sha yerda chiqadi.',
    # 404
    'Страница не найдена — PS SHOP': 'Sahifa topilmadi — PS SHOP',
    'Такой страницы нет': 'Bunday sahifa yo‘q',
    'Возможно, игру убрали из каталога. Посмотрите похожие или напишите нам.': 'Ehtimol, o‘yin katalogdan olib tashlangan. O‘xshashlarini ko‘ring yoki bizga yozing.',
    'Открыть каталог': 'Katalogni ochish',
    'Страница не найдена': 'Sahifa topilmadi',
    # страница игры
    'Цифровая версия. Подключим дистанционно.': 'Raqamli versiya. Masofadan ulab beramiz.',
    'Предзаказ: игра станет доступна в день выхода.': 'Oldindan buyurtma: o‘yin chiqqan kuni ochiladi.',
    'Язык': 'Til', 'Издание': 'Nashr', 'Игроков': 'O‘yinchilar', 'Платформа': 'Platforma', 'Дата выхода': 'Chiqish sanasi',
    'Русские субтитры': 'Rus tilida subtitrlar',
    'Английский язык': 'Ingliz tili',
    'Уточните у менеджера': 'Menejerdan aniqlang',
    'Геймплей': 'Geympley',
    'Популярное': 'Ommabop',
    'Для игры нужен шлем PS VR / PS VR2.': 'O‘yin uchun PS VR / PS VR2 shlemi kerak.',
    'Для этой игры нужна подписка PS Plus.': 'Bu o‘yin uchun PS Plus obunasi kerak.',
    'Платформа ': 'Platforma ',
}

# Шаблоны: (регулярное выражение по русскому тексту, замена)
PATTERNS = [
    (r'^В корзину: (.+)$', r'Savatga: \1'),
    (r'^сейчас ([\d\s]+) uzs$', r'hozir \1 uzs'),
    (r'^Экономия ([\d\s]+) uzs$', r'\1 uzs tejaysiz'),
    (r'^([\d\s]+) uzs/сутки$', r'\1 uzs/sutka'),
    (r'^(\d+) игр$', r'\1 ta o‘yin'),
    (r'^от ([\d\s]+)$', r'\1 dan'),
    (r'^Действует до (\d\d\.\d\d)$', r'\1 gacha amal qiladi'),
    (r'^Акция до (\d\d\.\d\d)$', r'Aksiya \1 gacha'),
    (r'^(.+) — ([\d\s]+) uzs для (PS4 и PS5|PS5|PS4) \| PS SHOP$', lambda m: f'{m.group(1)} — {m.group(3).replace(" и ", " va ")} uchun {m.group(2)} uzs | PS SHOP'),
    (r'^(.+) для (PS4 и PS5|PS5|PS4): (от )?([\d\s]+) uzs\. (.+?)\. Подключим дистанционно, гарантия, на связи 24/7\.$',
     lambda m: f'{m.group(1)} — {m.group(2).replace(" и ", " va ")} uchun {m.group(4)} uzs{" dan" if m.group(3) else ""}. {UZ.get(m.group(5), m.group(5))}. Masofadan ulab beramiz, kafolat, 24/7 aloqadamiz.'),
    (r'^(\d+) цифровых игр для PlayStation 4 и 5, подписки PS Plus и аренда PS5\. Подключим дистанционно, гарантия, на связи 24/7\.$',
     r'PlayStation 4 va 5 uchun \1 ta raqamli o‘yin, PS Plus obunalari va PS5 ijarasi. Masofadan ulab beramiz, kafolat, 24/7 aloqadamiz.'),
    (r'^(\d+) игр для PlayStation 4 и 5 с ценами в сумах\. Поиск, фильтры, предзаказы и хиты\.$',
     r'PlayStation 4 va 5 uchun \1 ta o‘yin, narxlar so‘mda. Qidiruv, filtrlar, oldindan buyurtmalar va xitlar.'),
]


def tr(text):
    """Перевод одной строки (текст между тегами или значение атрибута)."""
    core = text.strip()
    if not core or not re.search(r'[А-Яа-яЁё]', core):
        return text
    key = core.replace('\xa0', ' ')  # в ценах неразрывные пробелы
    if key in UZ:
        return text.replace(core, UZ[key])
    for rx, rep in PATTERNS:
        if re.match(rx, key):
            return text.replace(core, re.sub(rx, rep, key))
    return text
