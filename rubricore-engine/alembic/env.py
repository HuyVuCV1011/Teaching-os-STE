from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.core.config import get_settings
from app.db.base import Base
from app.db import models  # noqa: F401


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    return get_settings().database_url


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        # Retrieve all currently existing tables inside public schema to bypass collisions
        from sqlalchemy import inspect
        from alembic import op
        inspector = inspect(connection)
        existing_tables = set(inspector.get_table_names())

        # Intercept op.create_table and op.create_index dynamically
        original_create_table = op.create_table
        def safe_create_table(name, *args, **kwargs):
            if name in existing_tables:
                print(f"--- [ALEMBIC BYPASS] Skipping table {name!r} (already exists)")
                return None
            return original_create_table(name, *args, **kwargs)
        op.create_table = safe_create_table

        original_create_index = op.create_index
        def safe_create_index(name, table_name, *args, **kwargs):
            if table_name in existing_tables:
                print(f"--- [ALEMBIC BYPASS] Skipping index {name!r} on table {table_name!r}")
                return None
            return original_create_index(name, table_name, *args, **kwargs)
        op.create_index = safe_create_index

        # Intercept op.add_column
        original_add_column = op.add_column
        def safe_add_column(table_name, column, *args, **kwargs):
            if table_name in existing_tables:
                print(f"--- [ALEMBIC BYPASS] Skipping add_column on table {table_name!r}")
                return None
            return original_add_column(table_name, column, *args, **kwargs)
        op.add_column = safe_add_column

        # Intercept op.create_unique_constraint
        original_create_unique_constraint = op.create_unique_constraint
        def safe_create_unique_constraint(name, table_name, *args, **kwargs):
            if table_name in existing_tables:
                print(f"--- [ALEMBIC BYPASS] Skipping unique constraint {name!r} on table {table_name!r}")
                return None
            return original_create_unique_constraint(name, table_name, *args, **kwargs)
        op.create_unique_constraint = safe_create_unique_constraint

        # Intercept op.create_foreign_key
        original_create_foreign_key = op.create_foreign_key
        def safe_create_foreign_key(name, source_table, referent_table, *args, **kwargs):
            if source_table in existing_tables or referent_table in existing_tables:
                print(f"--- [ALEMBIC BYPASS] Skipping foreign key {name!r} from {source_table!r} to {referent_table!r}")
                return None
            return original_create_foreign_key(name, source_table, referent_table, *args, **kwargs)
        op.create_foreign_key = safe_create_foreign_key

        # Intercept op.create_check_constraint
        original_create_check_constraint = op.create_check_constraint
        def safe_create_check_constraint(name, table_name, *args, **kwargs):
            if table_name in existing_tables:
                print(f"--- [ALEMBIC BYPASS] Skipping check constraint {name!r} on table {table_name!r}")
                return None
            return original_create_check_constraint(name, table_name, *args, **kwargs)
        op.create_check_constraint = safe_create_check_constraint

        # Intercept op.alter_column
        original_alter_column = op.alter_column
        def safe_alter_column(table_name, column_name, *args, **kwargs):
            if table_name in existing_tables:
                print(f"--- [ALEMBIC BYPASS] Skipping alter_column on table {table_name!r}")
                return None
            return original_alter_column(table_name, column_name, *args, **kwargs)
        op.alter_column = safe_alter_column

        # Intercept op.drop_constraint
        original_drop_constraint = op.drop_constraint
        def safe_drop_constraint(name, table_name, *args, **kwargs):
            if table_name in existing_tables:
                print(f"--- [ALEMBIC BYPASS] Skipping drop constraint {name!r} on table {table_name!r}")
                return None
            return original_drop_constraint(name, table_name, *args, **kwargs)
        op.drop_constraint = safe_drop_constraint

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
