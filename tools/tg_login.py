# Разовый вход в Telegram на Mac владельца: создаёт ключ сессии для автопубликации.
# Ключ НЕ печатается на экран — он копируется в буфер обмена (pbcopy), чтобы вставить его в секрет GitHub TG_SESSION.
import getpass, subprocess, sys

try:
    from telethon.sync import TelegramClient
    from telethon.sessions import StringSession
except ImportError:
    print("Устанавливаю библиотеку telethon (один раз)…")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", "--quiet", "telethon"])
    from telethon.sync import TelegramClient
    from telethon.sessions import StringSession

print("\nВход в Telegram для PS SHOP. Данные берите на my.telegram.org/apps\n")
api_id = int(input("App api_id (число): ").strip())
api_hash = getpass.getpass("App api_hash (вводится невидимо, вставьте и нажмите Enter): ").strip()

with TelegramClient(StringSession(), api_id, api_hash) as client:
    client.start(
        phone=lambda: input("Номер телефона (+998…): ").strip(),
        code_callback=lambda: input("Код из Telegram: ").strip(),
        password=lambda: getpass.getpass("Облачный пароль Telegram, если есть (невидимо, иначе просто Enter): "),
    )
    me = client.get_me()
    session = client.session.save()

subprocess.run("pbcopy", input=session.encode(), check=True)
print(f"\n✅ Вход выполнен: {me.first_name}. Ключ скопирован в буфер обмена.")
print("Теперь вставьте его (Cmd+V) в секрет TG_SESSION на GitHub. На экран ключ не выводится — так безопаснее.")
