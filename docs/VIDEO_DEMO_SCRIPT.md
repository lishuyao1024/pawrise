# PawRise Milestone 2 Bilingual Video Script

## 使用方法

- 标有 **中文操作提示（不要念）** 的内容只告诉你应该点击什么、展示哪里。
- 标有 **English narration（照着念）** 的内容是视频中需要说的英文。
- 建议总时长约 8 分钟，必须控制在 6–10 分钟。
- 录制前先把 Postman、VS Code、终端和 SQLite 数据库查看器全部打开。

---

## 录制前准备

### 中文操作提示（不要念）

1. 在 VS Code 中打开 `pawrise` 项目。
2. 打开一个终端，进入：

```powershell
cd pawrise\backend
```

3. 激活虚拟环境并启动后端：

```powershell
.venv\Scripts\Activate.ps1
python run.py
```

4. 在 Postman 中导入：

```text
docs/PawRise_Milestone2.postman_collection.json
```

5. 在 SQLite Viewer 或 DB Browser for SQLite 中打开：

```text
backend/instance/pawrise.db
```

6. 提前找到以下5张表：

```text
users
user_settings
pets
care_reminders
memories
```

7. 调大 VS Code、终端、Postman 和数据库查看器的字体。
8. 关闭无关窗口和个人通知。

---

# 0:00–0:40 — Project Introduction

### 中文操作提示（不要念）

在 VS Code 左侧文件栏展示项目根目录。展开：

```text
backend
frontend
docs
```

不要逐个打开文件，只让老师看到项目结构。

### English narration（照着念）

> Hello. This is my PawRise Capstone Project Milestone 2 backend demonstration. PawRise is a pet health, care, and memory management application. It helps pet owners manage pet profiles, future care reminders, completed care history, meaningful memories, and notification settings in one organized system.
>
> For this milestone, I developed a REST API with Python and Flask and integrated it with a SQLite relational database. The repository includes the backend source code, database design, API documentation, automated tests, and demonstration materials.

---

# 0:40–1:20 — Backend Architecture and Database

### 中文操作提示（不要念）

先在 VS Code 打开：

```text
docs/er_diagram.png
```

停留几秒，让老师看清5张表和关系。

然后在文件栏快速展开：

```text
backend/app/models
backend/app/routes
backend/tests
```

### English narration（照着念）

> The backend uses five core database tables: users, user settings, pets, care reminders, and memories.
>
> One user can own many pets, and each pet can have many reminders and memories. Each user has one notification settings record. Foreign keys and cascade rules maintain the relationships between these tables.
>
> Completed reminders remain in the care reminders table as Care History. The Dashboard does not have a separate table because it calculates its information from the existing source tables. This avoids duplicate or inconsistent data.
>
> The backend follows a modular structure. SQLAlchemy models are stored in the models folder, Flask API routes are stored in the routes folder, and automated tests are stored in the tests folder.

---

# 1:20–2:05 — Health Check and Authentication

## Step 1: Health Check

### 中文操作提示（不要念）

在 Postman 中打开并运行：

```text
01. Health Check
```

让画面显示：

```text
200 OK
database: connected
```

### English narration（照着念）

> First, I will call the health-check endpoint. The API returns status code 200 and confirms that the Flask service is running and the database connection is available.

## Step 2: Register

### 中文操作提示（不要念）

运行：

```text
02. Register Demo User
```

展示 `201 Created` 和返回的用户JSON。

然后切换到数据库，刷新并依次打开：

```text
users
user_settings
```

指出两张表各增加了一行。不要展示或念JWT的完整内容。

### English narration（照着念）

> Next, I will register a demonstration user. The request returns status code 201 and creates a new user account.
>
> After registration, the users table contains the new account, and the user settings table contains one default settings record for the same user. These two records are created together in one database transaction.
>
> The password is never stored as plain text. The database stores only a secure password hash.

## Step 3: Login and Current User

### 中文操作提示（不要念）

依次运行：

```text
03. Login
04. Get Current User
```

展示两个请求都是 `200 OK`。指出 Postman 已自动保存JWT。

### English narration（照着念）

> The login endpoint verifies the email and password and returns a JSON Web Token. The Postman collection automatically saves this token and sends it with protected requests.
>
> The current-user endpoint uses the token to return the authenticated account. Protected endpoints reject requests that do not contain a valid token.

---

# 2:05–3:10 — Pet CRUD

## Step 4: Create Pet

### 中文操作提示（不要念）

运行：

```text
05. Create Pet
```

展示 `201 Created` 和 Dami 的JSON。

切换数据库，刷新：

```text
pets
```

指出新增加的 Dami 数据行。

### English narration（照着念）

> I will now create a pet profile for Dami. The API returns status code 201 and saves the profile in the pets table. The user ID foreign key connects Dami to the authenticated owner.

## Step 5: Read Pet Data

### 中文操作提示（不要念）

依次运行：

```text
06. List Pets
07. Get Pet
```

展示 `200 OK`。在 Get Pet 的返回中指出 summary。

### English narration（照着念）

> The list endpoint returns only pets owned by the authenticated user. The single-pet endpoint returns the complete profile and summary counts for active reminders, completed reminders, and memories.

## Step 6: Update Pet

### 中文操作提示（不要念）

运行：

```text
08. Update Pet
```

展示响应中的：

```text
weight_lb: 9.5
notes: Updated after the July checkup.
```

回到 `pets` 表并刷新，指出原来那一行被修改，没有产生新行。

### English narration（照着念）

> I will update Dami's weight from 9.2 to 9.5 pounds and change the profile notes. The API updates the existing database row instead of creating a duplicate record.

---

# 3:10–4:45 — Care Reminder CRUD and Repeating Logic

## Step 7: Create Reminder

### 中文操作提示（不要念）

运行：

```text
09. Create Repeating Reminder
```

展示 `201 Created`。

切换数据库并刷新：

```text
care_reminders
```

指出：

```text
completed_at = NULL
repeat_rule = every_2_months
```

### English narration（照着念）

> Next, I will create a repeating care reminder. The due date is generated dynamically so it is always a valid future date.
>
> The new database row has a repeat rule of every two months, and completed at is null because this is an active reminder.

## Step 8: List and Update Reminder

### 中文操作提示（不要念）

依次运行：

```text
10. List Active Reminders
11. Update Reminder
```

展示 Update 返回 `200 OK`。

刷新 `care_reminders` 表，指出：

```text
care_type 变成 checkup
due_date 改变
notes 改变
```

### English narration（照着念）

> The active-reminder endpoint supports filtering and due-date sorting. Reminder status is calculated by the backend as upcoming, due soon, or overdue. Users do not manually set the status.
>
> I will update the care type, due date, and notes. The existing database row now contains the updated values.

## Step 9: Complete Repeating Reminder

### 中文操作提示（不要念）

运行：

```text
12. Complete Repeating Reminder
```

在JSON响应中指出：

```text
completed_reminder
next_reminder
```

刷新 `care_reminders` 表。此时重点展示两行：

1. 原记录有 `completed_at`
2. 新记录 `completed_at` 是 NULL
3. 新记录有 `source_reminder_id`
4. 新记录 due date 是下一次日期

### English narration（照着念）

> This is the main reminder business rule. When I complete the repeating reminder, the backend updates the original row and creates the next occurrence in one database transaction.
>
> The original row now has a completion timestamp. The new active row has a calculated next due date and stores the original reminder ID as its source. If either database operation fails, the entire transaction is rolled back.

## Step 10: Care History and Delete Reminder

### 中文操作提示（不要念）

依次运行：

```text
13. View Care History
14. Delete Generated Reminder
```

展示 History 中包含已完成记录。

删除后刷新 `care_reminders`，指出自动生成的新记录已经消失，但已完成的历史记录仍存在。

### English narration（照着念）

> The Care History endpoint returns completed reminders in completion-time order. I will now delete the generated active reminder. The selected row is removed, while the completed history record remains available.

---

# 4:45–5:45 — Memory CRUD

## Step 11: Create and Read Memory

### 中文操作提示（不要念）

运行：

```text
15. Create Memory
16. List Memories
```

展示 `201 Created` 和 Memory JSON。

刷新数据库：

```text
memories
```

指出新增加的记录及其 `pet_id`。

### English narration（照着念）

> I will create a memory connected to Dami. The memory includes a title, date, category, scene, description, and image path.
>
> The pet ID foreign key connects the memory to Dami. The list endpoint can filter memories by pet and category and returns them in reverse chronological order.

## Step 12: Update and Delete Memory

### 中文操作提示（不要念）

运行：

```text
17. Update Memory
```

刷新 `memories` 表，指出 title 和 description 改变。

然后运行：

```text
18. Delete Memory
```

再次刷新表，指出记录已删除。

### English narration（照着念）

> I will update the title and description. The existing memory row changes without creating a duplicate.
>
> I will then delete the memory. The API returns status code 200, and the selected database row is removed.

---

# 5:45–6:35 — Settings and Dashboard

## Step 13: Settings

### 中文操作提示（不要念）

依次运行：

```text
19. Get Settings
20. Update Settings
```

展示 `default_lead_days` 从7变成3。

刷新数据库：

```text
user_settings
```

指出仍然只有一行，只是字段值改变。

### English narration（照着念）

> The settings endpoint returns the user's notification preferences. I will change the default reminder lead time from seven days to three days and disable the two Boolean options.
>
> The existing settings row is updated. The operation does not create a duplicate settings record.

## Step 14: Dashboard

### 中文操作提示（不要念）

运行：

```text
21. Get Dashboard
```

在返回JSON中展示：

```text
summary
pets
upcoming_reminders
overdue_items
recent_memories
```

### English narration（照着念）

> The Dashboard endpoint combines information from the user, pets, care reminders, memories, and settings tables.
>
> It is read-only and does not create a separate Dashboard database record. This design keeps the Dashboard consistent with the original source data.

---

# 6:35–7:05 — Cascade Delete

### 中文操作提示（不要念）

运行：

```text
22. Delete Pet and Related Data
```

然后依次刷新：

```text
pets
care_reminders
memories
```

指出：

- Dami 已从 `pets` 消失
- 剩余的已完成Reminder也被删除
- 与Dami有关的Memory不存在
- `users` 和 `user_settings` 仍然存在

### English narration（照着念）

> Finally, I will delete Dami's pet profile. The database foreign key and cascade rules remove the pet's remaining reminders and memories automatically.
>
> The user account and user settings remain because they belong to the user, not to the deleted pet.

---

# 7:05–7:40 — Automated Tests

### 中文操作提示（不要念）

切换到 VS Code 终端。

如果时间允许，现场运行：

```powershell
pytest
```

如果担心等待时间，可以提前运行，在这里展示最终输出：

```text
50 passed
```

然后快速打开：

```text
docs/TEST_CASES.md
docs/TEST_RESULTS.md
```

### English narration（照着念）

> The backend is verified by 50 automated pytest tests. The tests cover the database schema, authentication, authorization, all CRUD operations, validation, reminder recurrence, cascade deletion, settings, and Dashboard aggregation.
>
> All 50 tests pass. Each test uses a separate in-memory SQLite database, so the tests do not modify the local demonstration database.

---

# 7:40–8:25 — Issues and Resolutions

### 中文操作提示（不要念）

这一部分不需要点击Postman。画面可以停留在：

```text
backend/app/routes/reminders.py
```

或者展示 `TEST_RESULTS.md`。

英文可以正常语速念，不需要解释更多。

### English narration（照着念）

> I encountered several important backend design issues.
>
> First, storing reminder status directly could cause incorrect data as time passes. I resolved this by calculating status from the due date, completion time, and user lead-time setting.
>
> Second, recurring dates such as January 31 do not exist in every month. I resolved this by selecting the last valid day of the target month, and I added tests for normal years and leap years.
>
> Third, numeric resource IDs could be used to request another user's data. I resolved this by scoping every protected database query to the authenticated user ID.
>
> Finally, a separate Dashboard table could become inconsistent with the source records. I resolved this by calculating Dashboard data directly from the pet, reminder, memory, and settings tables.

---

# 8:25–8:40 — Conclusion

### 中文操作提示（不要念）

最后把画面切回项目根目录或 `README.md`。

### English narration（照着念）

> In conclusion, the PawRise Milestone 2 backend provides database-backed REST APIs for all core application functions. The APIs are documented, protected by authentication, validated, and verified by automated tests. Thank you for watching my demonstration.

---

# 最终录制检查

### 中文操作提示（不要念）

- [ ] 视频时长在6–10分钟之间
- [ ] 展示了项目结构和代码
- [ ] 展示了ER数据库图
- [ ] 展示了Postman请求和JSON响应
- [ ] 每次POST之后刷新了数据库
- [ ] 每次PUT之后刷新了数据库
- [ ] Complete Reminder之后展示了两条记录
- [ ] 每次DELETE之后刷新了数据库
- [ ] 展示了级联删除
- [ ] 展示了 `50 passed`
- [ ] 英文讨论了遇到的问题和解决办法
- [ ] 上传后检查视频链接权限
