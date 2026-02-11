# SAP HANA: Find Users and Export Roles/Privileges

Use the SQL below when you do not know the exact username and need to export role/privilege assignments.

## 1) Store discovered usernames in a local temporary table

```sql
DO
BEGIN
  -- Ignore "table does not exist" and drop only if present in this session.
  DECLARE EXIT HANDLER FOR SQL_ERROR_CODE 259 BEGIN END;
  EXECUTE IMMEDIATE 'DROP TABLE #TARGET_USERS';
END;

CREATE LOCAL TEMPORARY TABLE #TARGET_USERS (
    USER_NAME NVARCHAR(256) PRIMARY KEY
);

INSERT INTO #TARGET_USERS (USER_NAME)
SELECT DISTINCT U.USER_NAME
FROM SYS.USERS U
WHERE U.USER_NAME NOT LIKE '_SYS_%'
  AND NOT EXISTS (
      SELECT 1
      FROM #TARGET_USERS T
      WHERE T.USER_NAME = U.USER_NAME
  )
ORDER BY U.USER_NAME;

SELECT USER_NAME
FROM #TARGET_USERS
ORDER BY USER_NAME;
```

Optional filter (for a partial username):

```sql
TRUNCATE TABLE #TARGET_USERS;

INSERT INTO #TARGET_USERS (USER_NAME)
SELECT DISTINCT U.USER_NAME
FROM SYS.USERS U
WHERE U.USER_NAME NOT LIKE '_SYS_%'
  AND UPPER(U.USER_NAME) LIKE UPPER('%<PARTIAL_NAME>%')
  AND NOT EXISTS (
      SELECT 1
      FROM #TARGET_USERS T
      WHERE T.USER_NAME = U.USER_NAME
  )
ORDER BY U.USER_NAME;
```

## 2) Export granted roles for selected users in `#TARGET_USERS`

```sql
SELECT T.USER_NAME,
       R.ROLE_NAME
FROM #TARGET_USERS T
LEFT JOIN SYS.GRANTED_ROLES R
       ON R.GRANTEE = T.USER_NAME
ORDER BY T.USER_NAME, R.ROLE_NAME;
```



If you need additional role metadata (for example GRANTOR or grantable/admin flags), first check which columns exist in your system:

```sql
SELECT COLUMN_NAME
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'SYS'
  AND TABLE_NAME = 'GRANTED_ROLES'
  AND COLUMN_NAME IN ('GRANTOR', 'ADMIN_OPTION', 'IS_GRANTABLE', 'GRANTABLE', 'CREATE_TIME')
ORDER BY COLUMN_NAME;
```

Then use only columns that exist in your system (example with `GRANTOR` + `IS_GRANTABLE`):

```sql
SELECT T.USER_NAME,
       R.ROLE_NAME,
       R.GRANTOR,
       R.IS_GRANTABLE
FROM #TARGET_USERS T
LEFT JOIN SYS.GRANTED_ROLES R
       ON R.GRANTEE = T.USER_NAME
ORDER BY T.USER_NAME, R.ROLE_NAME;
```

## 3) Export direct system/object privileges for selected users

```sql
SELECT T.USER_NAME,
       P.PRIVILEGE,
       P.OBJECT_TYPE,
       P.SCHEMA_NAME,
       P.OBJECT_NAME
FROM #TARGET_USERS T
LEFT JOIN SYS.GRANTED_PRIVILEGES P
       ON P.GRANTEE = T.USER_NAME
ORDER BY T.USER_NAME, P.OBJECT_TYPE, P.SCHEMA_NAME, P.OBJECT_NAME, P.PRIVILEGE;
```



If you need additional privilege metadata (for example `GRANTOR`, `GRANTABLE`, `IS_GRANTABLE`, `CREATE_TIME`), first check which columns exist in your system:

```sql
SELECT COLUMN_NAME
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'SYS'
  AND TABLE_NAME = 'GRANTED_PRIVILEGES'
  AND COLUMN_NAME IN ('GRANTOR', 'GRANTABLE', 'IS_GRANTABLE', 'ADMIN_OPTION', 'CREATE_TIME')
ORDER BY COLUMN_NAME;
```

Then use only columns that exist in your system (example with `GRANTOR` + `IS_GRANTABLE`):

```sql
SELECT T.USER_NAME,
       P.PRIVILEGE,
       P.OBJECT_TYPE,
       P.SCHEMA_NAME,
       P.OBJECT_NAME,
       P.GRANTOR,
       P.IS_GRANTABLE
FROM #TARGET_USERS T
LEFT JOIN SYS.GRANTED_PRIVILEGES P
       ON P.GRANTEE = T.USER_NAME
ORDER BY T.USER_NAME, P.OBJECT_TYPE, P.SCHEMA_NAME, P.OBJECT_NAME, P.PRIVILEGE;
```

## 4) Include inherited access via roles (effective privileges)

```sql
SELECT E.USER_NAME,
       E.PRIVILEGE,
       E.OBJECT_TYPE,
       E.SCHEMA_NAME,
       E.OBJECT_NAME
FROM SYS.EFFECTIVE_PRIVILEGES E
JOIN #TARGET_USERS T
  ON T.USER_NAME = E.USER_NAME
ORDER BY E.USER_NAME, E.OBJECT_TYPE, E.SCHEMA_NAME, E.OBJECT_NAME, E.PRIVILEGE;
```



If you need additional effective-privilege metadata (for example `SOURCE`), first check which columns exist in your system:

```sql
SELECT COLUMN_NAME
FROM SYS.TABLE_COLUMNS
WHERE SCHEMA_NAME = 'SYS'
  AND TABLE_NAME = 'EFFECTIVE_PRIVILEGES'
  AND COLUMN_NAME IN ('SOURCE', 'PRIVILEGE_TYPE', 'IS_VALID')
ORDER BY COLUMN_NAME;
```

Then use only columns that exist in your system (example with `SOURCE`):

```sql
SELECT E.USER_NAME,
       E.PRIVILEGE,
       E.OBJECT_TYPE,
       E.SCHEMA_NAME,
       E.OBJECT_NAME,
       E.SOURCE
FROM SYS.EFFECTIVE_PRIVILEGES E
JOIN #TARGET_USERS T
  ON T.USER_NAME = E.USER_NAME
ORDER BY E.USER_NAME, E.OBJECT_TYPE, E.SCHEMA_NAME, E.OBJECT_NAME, E.PRIVILEGE;
```

## 5) Optional: run for a single known user

```sql
TRUNCATE TABLE #TARGET_USERS;
INSERT INTO #TARGET_USERS VALUES ('<USER_NAME>');
```

Then re-run sections **2-4**.

## 6) Export to CSV using `hdbsql`

Create a SQL script (`export_users_roles_privileges.sql`) with sections **1-4**, then run:

```bash
hdbsql -n <host:3xx15> -d <DB_NAME> -u <ADMIN_USER> -p '<PASSWORD>' -I export_users_roles_privileges.sql
```

Example direct CSV exports for one known user:

```bash
hdbsql -n <host:3xx15> -d <DB_NAME> -u <ADMIN_USER> -p '<PASSWORD>' -A -x -o roles_<USER_NAME>.csv \
"SELECT GRANTEE, ROLE_NAME FROM SYS.GRANTED_ROLES WHERE GRANTEE = '<USER_NAME>' ORDER BY ROLE_NAME"

hdbsql -n <host:3xx15> -d <DB_NAME> -u <ADMIN_USER> -p '<PASSWORD>' -A -x -o privileges_<USER_NAME>.csv \
"SELECT GRANTEE, PRIVILEGE, OBJECT_TYPE, SCHEMA_NAME, OBJECT_NAME FROM SYS.GRANTED_PRIVILEGES WHERE GRANTEE = '<USER_NAME>' ORDER BY OBJECT_TYPE, SCHEMA_NAME, OBJECT_NAME, PRIVILEGE"
```

> Notes:
> - Local temporary tables exist only for the current session/connection.
> - The `INSERT` statements use `DISTINCT` + `NOT EXISTS` so they can be safely re-run without duplicate key errors.
> - If your SQL client does not allow anonymous `DO ... BEGIN ... END`, run `DROP TABLE #TARGET_USERS;` manually before the `CREATE` statement.
> - `SYS.GRANTED_PRIVILEGES` column names vary by HANA version; use the metadata check before selecting optional grant-related columns.
> - `SYS.EFFECTIVE_PRIVILEGES` column names can also vary (for example `SOURCE` may be missing). Use the metadata check before selecting optional fields.
> - Run these queries using a user with catalog read permissions (for example a security admin role).

