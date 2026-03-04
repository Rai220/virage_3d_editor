# Virage 3D Editor — инструкции для Claude

## Обязательные проверки перед коммитом

- Перед каждым коммитом запускать `npm run lint` и убедиться, что ошибок нет.
- В CI lint блокирует деплой: если lint падает, деплой на GitHub Pages не происходит.

## Релиз десктопного приложения

При выпуске новой версии нужно обновить версию **в двух файлах** перед созданием тега:

1. `package.json` → поле `"version"`
2. `src-tauri/tauri.conf.json` → поле `"version"`

Версии должны совпадать между собой и с тегом (без префикса `v`).

Порядок действий:
```bash
# 1. Обновить version в package.json и src-tauri/tauri.conf.json
# 2. Закоммитить и запушить
git push origin master
# 3. Создать и запушить тег
git tag v0.X.Y
git push origin v0.X.Y
```

GitHub Actions (`release.yml`) соберёт установщики для Windows, macOS (arm64 + x86_64), Linux и опубликует их в GitHub Releases.
