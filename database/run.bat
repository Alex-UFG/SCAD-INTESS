@echo off
set /p MYSQL_USER=Usuario MySQL (default root): 
if "%MYSQL_USER%"=="" set MYSQL_USER=root
mysql -u %MYSQL_USER% -p < 001_schema.sql
mysql -u %MYSQL_USER% -p < 002_seed.sql
echo Base de datos scad_intess lista.