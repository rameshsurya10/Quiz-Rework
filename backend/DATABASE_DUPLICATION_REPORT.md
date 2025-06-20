# Database Duplication Report

## Overview

This report documents duplicate and overlapping tables identified in the database schema. These duplications should be addressed to improve database maintainability and prevent potential data inconsistencies.

## Identified Duplications

### 1. Quiz Tables

Two tables store quiz information with similar fields but different primary keys:

#### `quiz` Table (DEPRECATED - DO NOT USE)
- Primary Key: `uuid` (UUID field)
- Notable Fields: 
  - `title`
  - `description`
  - `is_published`
  - `published_at`
  - `time_limit_minutes`
  - `passing_score`
  - `max_attempts`
  - `shuffle_questions`
  - `show_answers`
  - `start_date`
  - `end_date`
  - `creator` (Foreign Key to `AccountsUser`)
  - `uploadedfiles` (JSON field)

#### `quizzes` Table (ACTIVE - USE THIS TABLE)
- Primary Key: `quiz_id` (Integer field)
- Notable Fields:
  - `title`
  - `description`
  - `no_of_questions`
  - `quiz_type`
  - `question_type`
  - `uploadedfiles` (JSON field)
  - `pages` (JSON field)
  - `quiz_date`
  - `is_published`
  - `published_at`
  - `time_limit_minutes`
  - `passing_score`
  - `department_id` (Foreign Key to `department`)
  - `creator` (Character varying)
  - `share_url`

#### `quiz_backup` Table
- This table appears to be an explicit backup of the `quiz` table
- No Primary Key defined
- Contains similar fields to the `quiz` table

### 2. Quiz Attempt Tables (DEPRECATED)

These tables are likely unused since the application has moved to using the `quizzes` table:

#### `quiz_quizattempt` Table
- Related to the deprecated `quiz` table

#### `quizzes_quizattempt` Table
- Related to the active `quizzes` table

## Recommendations

1. **Use Only `quizzes` Table**: All new code should exclusively use the `quizzes` table, not the deprecated `quiz` table.

2. **Data Migration**: If there is any valuable data in the `quiz` table that hasn't been migrated to the `quizzes` table, it should be migrated.

3. **Remove Deprecated Tables**: After confirming all data has been migrated and no code references the deprecated tables, they should be dropped from the database:
   - `quiz` table
   - `quiz_quizattempt` table
   - `quiz_backup` table (unless needed for historical purposes)

4. **Update Foreign Keys**: Ensure all foreign key references point to the `quizzes` table instead of the `quiz` table.

5. **Code Cleanup**: Remove any code that references the deprecated tables to prevent confusion and potential bugs.

## Implementation Plan

1. **Verify Active Usage**: Confirm through database queries that the `quizzes` table is actively used and contains all necessary data.

2. **Update Documentation**: Update all documentation to reflect that only the `quizzes` table should be used.

3. **Backup Before Removal**: Before dropping any tables, create backups of the data.

4. **Execute Schema Changes**: After thorough testing, execute the necessary SQL commands to remove the deprecated tables.

## Analysis

### Quiz Tables
- The `quiz` table uses a UUID as primary key, while `quizzes` uses an auto-incrementing integer
- `quizzes` has additional fields like `quiz_type`, `question_type`, and `department`
- `quiz` has additional fields like `max_attempts`, `shuffle_questions`, and `show_answers`
- The `creator` field is a Foreign Key in `quiz` but a Character field in `quizzes`

### Quiz Attempt Tables
- The tables have different naming conventions for similar fields (e.g., `start_time` vs `started_at`)
- `quizzes_quizattempt` has a unique constraint on (`quiz`, `user`, `started_at`)
- `quiz_quizattempt` references the `Quizzes` model, while `quizzes_quizattempt` references the `Quiz` model

## Next Steps

1. Run database queries to determine table usage:
   ```sql
   SELECT COUNT(*) FROM quiz;
   SELECT COUNT(*) FROM quizzes;
   SELECT MAX(created_at) FROM quiz;
   SELECT MAX(created_at) FROM quizzes;
   ```

2. Review code to identify which models are actively used:
   ```bash
   grep -r "from .models import Quiz" --include="*.py" backend/
   grep -r "from .models import Quizzes" --include="*.py" backend/
   ```

3. Once the active tables are identified, create a detailed migration plan to consolidate the schema.

## Conclusion

Addressing these database duplications will improve the maintainability of the codebase and prevent potential data inconsistencies. The recommended approach is to first identify which tables are actively being used, then create a migration plan to consolidate the schema. 

## Additional Cleanup Steps

1. **Delete Unused Database Tables**:
   ```sql
   -- Run these in the Supabase SQL editor after confirming they're not in use
   DROP TABLE IF EXISTS quiz;
   DROP TABLE IF EXISTS quiz_quizattempt;
   ```

2. **Remove Remaining Duplicate Code**:
   - Remove the `extract_text_from_pdf` method from `quiz/views.py` since we've already updated the code to use the centralized version

3. **Update Documentation**:
   - Update the database documentation to clearly indicate that `quizzes` is the active table
   - Add a note in the code comments that `documents/utils.py` contains the centralized text extraction utilities

4. **Clean up Imports**:
   - Review and clean up imports in files where we've removed duplicate code

Would you like me to implement any of these additional cleanup steps? 