import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:harshal123@localhost:5432/postgres")
# parse url
import urllib.parse
result = urllib.parse.urlparse(db_url)
username = result.username
password = result.password
database = result.path[1:]
hostname = result.hostname
port = result.port

try:
    # Connect to the default postgres database
    con = psycopg2.connect(dbname='postgres', user=username, host=hostname, password=password, port=port)
    con.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = con.cursor()
    cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{database}'")
    exists = cur.fetchone()
    if not exists:
        print(f"Creating database {database}...")
        cur.execute(f"CREATE DATABASE {database}")
        print("Database created.")
    else:
        print("Database already exists.")
    cur.close()
    con.close()
except Exception as e:
    print(e)
