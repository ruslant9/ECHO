import os
import shutil

def collect_and_flatten_files(base_dirs, target_dir):
    """
    Собирает указанные файлы из исходных директорий, переименовывает их,
    чтобы избежать дубликатов, и сохраняет в одну целевую папку.
    Содержимое schema.prisma сохраняется в отдельный текстовый файл.
    Игнорирует директории 'node_modules', а также файлы '.gitignore', '.env' и '.prettierrc'.

    Args:
        base_dirs (list): Список корневых директорий для сканирования (например, ["backend", "frontend"]).
        target_dir (str): Целевая папка для сохранения файлов.
    """

    # Создаем целевую папку, если она не существует
    os.makedirs(target_dir, exist_ok=True)

    collected_files_info = {}

    # Определяем список файлов, которые нужно собрать
    script_extensions = ('.ts', '.tsx')
    config_filenames = (
        'package.json',
        'nest-cli.json',
        '.eslintrc.cjs',
        # '.prettierrc',   # Исключено по запросу пользователя
        'tsconfig.json',
        'next.config.js',
        'postcss.config.cjs',
        'tailwind.config.ts',
        'schema.prisma',
        'prettierrc', # На случай если имя без точки, хотя основная форма .prettierrc
        '.prettierignore',
        'next-env.d.ts',
        'jest-e2e.json'
    )

    # Список файлов, которые всегда следует пропускать
    always_exclude_files = ('.gitignore', '.env', '.prettierrc')

    print(f"Сканирование директорий: {base_dirs}")

    for base_dir in base_dirs:
        if not os.path.exists(base_dir):
            print(f"Предупреждение: Директория '{base_dir}' не найдена. Пропускаем.")
            continue

        for root, dirs, files in os.walk(base_dir):
            # Игнорируем директории 'node_modules'
            if 'node_modules' in dirs:
                dirs.remove('node_modules')

            for filename in files:
                # Игнорируем файлы из списка always_exclude_files
                if filename in always_exclude_files:
                    print(f"Пропускаем файл: {os.path.join(root, filename)} (исключено по запросу)")
                    continue

                file_path = os.path.join(root, filename)

                # Проверяем, является ли файл скриптом или конфигурацией
                if filename.lower().endswith(script_extensions) or filename.lower() in config_filenames:
                    # Создаем уникальное имя файла для сохранения
                    relative_path = os.path.relpath(file_path, start=os.path.commonpath(base_dirs))
                    
                    # Специальная обработка для корневых файлов, чтобы не добавлять лишние подчеркивания
                    if os.path.basename(file_path) == filename and os.path.dirname(file_path) == base_dir:
                        new_filename = f"{os.path.basename(base_dir)}_{filename}"
                    else:
                        new_filename = relative_path.replace(os.sep, '_')
                        # Заменяем точки в имени файла, но оставляем последнее расширение
                        name_part, ext_part = os.path.splitext(new_filename)
                        if ext_part: # если есть расширение
                            new_filename = name_part.replace('.', '_') + ext_part
                        else:
                            new_filename = name_part.replace('.', '_')
                        
                        # Удаляем лишние подчеркивания, если они образовались
                        new_filename = new_filename.replace('__', '_').strip('_')


                    target_file_path = os.path.join(target_dir, new_filename)

                    collected_files_info[file_path] = target_file_path
                    print(f"Найден файл: {file_path} -> {target_file_path}")

    # Обработка schema.prisma
    prisma_found = False
    schema_prisma_content = None
    for original_path, target_path in collected_files_info.items():
        if os.path.basename(original_path) == 'schema.prisma':
            try:
                with open(original_path, 'r', encoding='utf-8') as f:
                    schema_prisma_content = f.read()
                prisma_found = True
                print(f"Содержимое файла schema.prisma прочитано из: {original_path}")
                break
            except Exception as e:
                print(f"Ошибка при чтении schema.prisma из {original_path}: {e}")

    if prisma_found and schema_prisma_content is not None:
        prisma_output_path = os.path.join(target_dir, 'schema_prisma_structure.txt')
        try:
            with open(prisma_output_path, 'w', encoding='utf-8') as f:
                f.write(schema_prisma_content)
            print(f"Содержимое schema.prisma сохранено в: {prisma_output_path}")
        except Exception as e:
            print(f"Ошибка при сохранении содержимого schema.prisma в {prisma_output_path}: {e}")

    # Копирование всех остальных файлов
    for original_path, target_path in collected_files_info.items():
        if os.path.basename(original_path) == 'schema.prisma':
            continue # schema.prisma уже обработан отдельно

        try:
            shutil.copy2(original_path, target_path)
            # print(f"Файл '{os.path.basename(original_path)}' скопирован как '{os.path.basename(target_path)}'")
        except Exception as e:
            print(f"Ошибка при копировании файла {original_path} в {target_path}: {e}")

    print("\nСкрипт завершен. Все полезные файлы сохранены в D:\\Echo\\Для ИИ, исключая node_modules, .gitignore, .env и .prettierrc.")

# Укажите корневые папки вашего проекта
base_directories = ["backend", "frontend"]
target_directory = r"D:\Echo\Для ИИ"

collect_and_flatten_files(base_directories, target_directory)