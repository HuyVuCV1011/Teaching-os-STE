CREATE DATABASE home_credit;
USE home_credit

CREATE TABLE view_credit (
    ID INT PRIMARY KEY,
    DATE DATE,
    CREDIT_AMOUNT INT,
    ID_PERSON INT,
    PAYMENT_NUM INT,
    INTEREST FLOAT
);

INSERT INTO view_credit (ID, DATE, CREDIT_AMOUNT, ID_PERSON, PAYMENT_NUM, INTEREST) VALUES
(1001, '2006-09-03', 40000, 5001, 6, 0.15),
(1002, '2006-09-10', 30000, 5002, 7, 0.19),
(1003, '2006-09-13', 30000, 5003, 8, 0.25),
(1004, '2006-09-23', 25000, 5004, 9, 0.17),
(1011, '2007-09-22', 30000, 5009, 6, 0.22),
(1012, '2007-11-11', 62000, 5003, 11, 0.25),
(1005, '2006-09-23', 40000, 5005, 5, 0.18),
(1006, '2006-09-26', 30000, 5006, 6, 0.13),
(1007, '2006-10-03', 30000, 5007, 5, 0.19),
(1008, '2006-10-09', 25000, 5008, 10, 0.22),
(1009, '2006-10-11', 50000, 5009, 12, 0.25),
(1010, '2006-10-12', 55000, 5010, 12, 0.11);

CREATE TABLE view_person (
    ID_PERSON INT PRIMARY KEY,
    DATE_BIRTH DATE,
    NAME1 VARCHAR(50),
    NAME2 VARCHAR(50),
    NAME3 VARCHAR(50),
    CHILD_NUM INT
);

INSERT INTO view_person (ID_PERSON, DATE_BIRTH, NAME1, NAME2, NAME3, CHILD_NUM) VALUES
(5001, '1985-09-03', 'Igor', 'Levy', NULL, 0),
(5002, '1954-05-13', 'Ilja', 'Muromec', 'Blazen', 0),
(5003, '1980-09-26', 'Martin', 'Zahalka', NULL, 1),
(5004, '1949-04-11', 'Frantisek', 'Pravy', 'Lotr', 2),
(5005, '1974-08-23', 'Sergey', 'Panda', 'Zlobr', 3),
(5006, '1974-09-26', 'Maxim', 'Gross', NULL, 2),
(5007, '1981-12-03', 'Vladimir', 'Havel', NULL, 1),
(5008, '1965-10-09', 'Lumir', 'Robinson', 'Zubejda', 1),
(5009, '1977-06-21', 'Jiri', 'Marat', 'Hele', 1),
(5000, '1993-01-30', 'John', 'Smith', NULL, 0),
(5011, '1932-11-25', 'Martin', 'Schmidt', NULL, 2),
(5010, '1980-08-12', 'Jan', 'Marek', NULL, 0);

/*
1. Which query returns detailed information about all credits and clients who got those
credits?
a) SELECT * FROM view_credit c RIGHT JOIN view_person p ON c.id = p.id_person
b) SELECT * FROM view_credit c JOIN view_person p ON p.id_person = c.id_person
c) SELECT * FROM view_credit c LEFT JOIN view_person p ON p.id_person = c.id_person
d) SELECT * FROM view_credit c FULL OUTER JOIN view_person p ON p.id_person =
c.id_person
*/

-- Answer: b) JOIN ở đây giống như INNER JOIN, chỉ trả về những bản ghi có trong cả hai bảng, tức là những khách hàng đã nhận được tín dụng.
SELECT * FROM view_credit c JOIN view_person p ON p.id_person = c.id_person

/*
2. Which query returns detailed information about all clients and credits they got (i.e., it
shows all clients and credits data for those who have it)?
a) SELECT * FROM view_person p JOIN view_credit c ON p.id_person = c.id_person
b) SELECT * FROM view_credit c JOIN view_person p ON p.id_person = c.id_person
c) SELECT * FROM view_credit c LEFT JOIN view_person p ON p.id_person = c.id_person
d) SELECT * FROM view_person p LEFT JOIN view_credit c ON p.id_person = c.id_person
*/

-- Answer: d) LEFT JOIN ở đây sẽ trả về tất cả các khách hàng, kể cả những khách hàng không có tín dụng

SELECT * FROM view_person p LEFT JOIN view_credit c ON p.id_person = c.id_person

-- Nếu xét rằng chỉ lấy khách hàng đã có tín dùng thì chọn câu a hoặc b đều đúng
SELECT * FROM view_person p JOIN view_credit c ON p.id_person = c.id_person
SELECT * FROM view_credit c JOIN view_person p ON p.id_person = c.id_person

/*
3. Which query returns information about all clients who don't have any credit?
a) SELECT c.* FROM view_person p LEFT JOIN view_credit c ON p.id_person = c.id_person
WHERE c.id_person IS NULL
b) SELECT p.* FROM view_person p LEFT JOIN view_credit c ON p.id_person = c.id_person
WHERE c.id IS NULL
c) SELECT p.* FROM view_person p WHERE p.id_person NOT IN (SELECT p.id_person
FROM view_credit)
d) SELECT p.* FROM view_person p WHERE p.id_person NOT IN (SELECT c.id_person
FROM view_credit c WHERE p.id_person = c.id_person)
*/

-- Answer: d) Câu này sẽ trả về tất cả khách hàng mà không có id_person nào trong bảng view_credit, tức là những khách hàng không có tín dụng nào.
SELECT p.* FROM view_person p WHERE p.id_person NOT IN (SELECT c.id_person
FROM view_credit c WHERE p.id_person = c.id_person)

-- Hoặc
SELECT p.* FROM view_person p LEFT JOIN view_credit c ON p.id_person = c.id_person
WHERE c.id IS NULL
-- Hoặc
SELECT p.* FROM view_person p LEFT JOIN view_credit c ON p.id_person = c.id_person
WHERE c.id_person IS NULL
-- Hoặc
SELECT p.* FROM view_person p FULL OUTER JOIN view_credit c ON p.id_person = c.id_person
WHERE c.id_person IS NULL 
-- Hoặc
SELECT p.* FROM view_person p FULL OUTER JOIN view_credit c ON p.id_person = c.id_person
WHERE c.CREDIT_AMOUNT IS NULL OR c.CREDIT_AMOUNT <=0

/*
4. Which query returns information about all clients who have more than 1 credit?
a) SELECT p.* FROM view_person p WHERE (SELECT COUNT(c.id) FROM view_credit c
WHERE c.id_person = p.id_person) > 1
b) SELECT p.* FROM view_person p WHERE (SELECT COUNT(c.id) FROM view_credit c
WHERE c.id_person = p.id_person) = 2
c) SELECT p.* FROM view_person p JOIN (SELECT COUNT(*) k, c.id_person FROM
view_credit c GROUP BY c.id HAVING COUNT(*) > 1) g ON p.id_person = g.id_person
d) SELECT p.* FROM view_person p JOIN (SELECT COUNT(*) k, c.id_person FROM
view_credit c GROUP BY c.id_person WHERE COUNT(*) > 1) g ON p.id_person = g.id_person
*/
-- Answer: a) Câu này sẽ trả về tất cả khách hàng mà có số lượng tín dụng lớn hơn 1.
SELECT p.* FROM view_person p WHERE (SELECT COUNT(c.id) FROM view_credit c
WHERE c.id_person = p.id_person) > 1

-- Hoặc CTE
WITH credit_count AS (
    SELECT id_person, COUNT(*) AS credit_num
    FROM view_credit
    GROUP BY id_person
    HAVING COUNT(*) > 1
)   
SELECT p.* FROM view_person p JOIN credit_count cc ON p.id_person = cc.id_person

/*
5. What query returns the following result?

INTEREST

CREDIT_AM
OUNT_SUM

CREDIT_AM
OUNT_MAX Accs
0.11 6200000 80000 512
0.13 3000000 50000 148
0.15 4000000 30000 212
0.17 3250000 60000 303
Columns Description:
● INTEREST: All possible interest rates from data (listed lowest to highest)
● CREDIT_AMOUNT_SUM: Sum of amounts with this interest
● CREDIT_AMOUNT_MAX: Maximum amount with this interest
● Accs: Number of accounts with this interest
Hint: SELECT interest FROM view_credit WHERE interest < 0.18
*/
-- Answer:
SELECT 
    INTEREST, 
    SUM(CREDIT_AMOUNT) AS CREDIT_AMOUNT_SUM, 
    MAX(CREDIT_AMOUNT) AS CREDIT_AMOUNT_MAX, 
    COUNT(*) AS Accs
FROM view_credit
GROUP BY INTEREST
HAVING INTEREST < 0.18

-- nó không giống với kết quả. Có thể do dữ liệu mẫu quá ít dòng. thực tế mỗi mức lãi suất này chỉ có một dòng số liệu.
/*
6. Which query returns the average age of clients who have credits?
a) SELECT AVG((SYSDATE - p.date_birth)/365.25) FROM view_person p
b) SELECT AVG((SYSDATE - p.date_birth)/365.25) FROM view_person p WHERE p.id_person
IN (SELECT id_person FROM view_credit c)
c) SELECT AVG((SYSDATE - p.date_birth)/365) FROM view_person p LEFT JOIN view_credit
c ON p.id_person = c.id_person
d) SELECT AVG((SYSDATE - p.date_birth)/365) FROM view_person p
*/
-- Cầu b nhưng không dùng được với azure sql.

SELECT AVG((SYSDATE - p.date_birth)/365.25) FROM view_person p WHERE p.id_person
IN (SELECT id_person FROM view_credit c)

SELECT AVG(DATEDIFF(day, p.date_birth, GETDATE()) / 365.25) 
FROM view_person p 
WHERE p.id_person IN (SELECT id_person FROM view_credit)

/*
7. Which query returns the average number of children for all clients?
a) SELECT AVG(p.child_num) FROM view_person p
b) SELECT AVG(p.child_num) FROM view_person p WHERE p.id_person IN (SELECT
id_person FROM view_credit c)
c) SELECT SUM(p.child_num)/COUNT(*) FROM view_person p WHERE p.id_person IN
(SELECT id_person FROM view_credit c)
d) SELECT AVG(p.child_num) FROM view_person p WHERE p.id_person IN (SELECT
id_person FROM view_credit c WHERE c.id_person = p.id_person)
*/
-- Answer: a) Câu này sẽ trả về trung bình số con của tất cả khách hàng, bất kể họ có tín dụng hay không.
SELECT AVG(p.child_num) AS AVG_CHILD FROM view_person p
-- Nếu khách hàng có tín dụng thì chọn câu b hoặc d đều được
SELECT AVG(p.child_num) AS AVG_CHILD FROM view_person p WHERE p.id_person IN (SELECT DISTINCT id_person FROM view_credit c)
SELECT AVG(p.child_num) AS AVG_CHILD FROM view_person p WHERE p.id_person IN (SELECT DISTINCT id_person FROM view_credit c WHERE c.id_person = p.id_person)

/*
1. Salary Calculation
There are 6 employees in a company. Two of them have a yearly salary of 11,000 USD. One of
them gets 8,000 USD per year. The others get 14,000 USD.
Question: What is the average monthly cost for salary for one employee in this company?
Why?
*/
-- Answer: The average monthly cost for salary for one employee in this company is calculated as follows:
-- Total yearly salary = (2 * 11,000) + (1 * 8,000) + (3 * 14,000) = 22,000 + 8,000 + 42,000 = 72,000 USD
-- Average yearly salary per employee = Total yearly salary / Number of employees = 72,000 / 6 = 12,000 USD
-- Average monthly salary per employee = Average yearly salary / 12 = 12,000 / 12 = 1,000 USD

SELECT (2 * 11000 + 1 * 8000 + 3 * 14000) / 6 / 12 AS Average_Monthly_Salary

-- Nếu hiểu theo cách 2 người có tổng lương/năm là 11,000 USD và các trường hợp khác cũng tương tự thì

SELECT (11000 + 8000 + 14000) / 6 / 12 AS Average_Monthly_Salary

/*
2. Logical Statements
Statements:
● All flowers are cats.
● All fans are cats.
Conclusions:
I. All flowers are fans.
II. Some fans are flowers.
*/
-- cả 2 đều đúng e) Both I and II follow
