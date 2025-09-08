# Challenges System

This module implements a text-based challenge system with optional photo experiments for electrical engineering education.

## Features

- **Text-based Questions**: Users answer questions by typing their responses
- **Progressive Unlocking**: Challenges unlock sequentially as users complete them
- **Photo Experiments**: Some challenges require photo submissions after correct answers
- **Case-insensitive Validation**: Answer validation is flexible and case-insensitive
- **Multiple Answer Support**: Supports comma-separated acceptable answers

## API Endpoints

### GET /challenges
Returns all challenges with user progress status.

**Response:**
```json
[
  {
    "id": "challenge_id",
    "title": "Challenge Title",
    "description": "Challenge description",
    "question": "What is the question?",
    "difficulty": "easy|medium|hard|expert",
    "hasPhotoExperiment": false,
    "photoPrompt": "Photo instructions (if applicable)",
    "order": 1,
    "userProgress": {
      "status": "locked|unlocked|completed",
      "userAnswer": "user's answer",
      "isAnswerCorrect": true,
      "photoUrl": "path/to/photo",
      "completedAt": "2023-01-01T00:00:00.000Z"
    }
  }
]
```

### GET /challenges/:id
Returns a specific challenge with user progress.

### POST /challenges/:id/submit-answer
Submit a text answer to a challenge.

**Request Body:**
```json
{
  "answer": "user's answer"
}
```

**Response:**
```json
{
  "success": true,
  "isCorrect": true,
  "message": "Correct answer! Challenge completed.",
  "nextChallengeUnlocked": true,
  "requiresPhotoExperiment": false
}
```

### POST /challenges/:id/submit-photo
Submit a photo for challenges that require photo experiments.

**Request:** Multipart form data with 'photo' field
**Supported formats:** JPG, PNG
**Max file size:** 5MB

## Database Schema

### Challenge
- `title`: String - Challenge title
- `description`: String - Challenge description  
- `question`: String - The question to ask
- `correctAnswer`: String - Expected answer (supports comma-separated alternatives)
- `difficulty`: String - easy, medium, hard, expert
- `hasPhotoExperiment`: Boolean - Whether photo submission is required
- `photoPrompt`: String - Instructions for photo experiment
- `order`: Number - Challenge sequence order

### UserChallengeProgress
- `userId`: ObjectId - Reference to User
- `challengeId`: ObjectId - Reference to Challenge
- `status`: String - locked, unlocked, completed
- `userAnswer`: String - User's submitted answer
- `isAnswerCorrect`: Boolean - Whether answer was correct
- `photoUrl`: String - Path to uploaded photo
- `completedAt`: Date - When challenge was completed

## Challenge Flow

1. **First Challenge**: Automatically unlocked for new users
2. **Answer Submission**: User submits text answer
3. **Validation**: System validates answer (case-insensitive)
4. **Photo Experiment** (if required): User submits photo after correct answer
5. **Completion**: Challenge marked complete, next challenge unlocked

## Seeding Data

To populate the database with the 12 electrical engineering challenges:

```bash
npm run seed:challenges
```

This will:
1. Build the project
2. Clear existing challenges
3. Insert the predefined challenge data

## File Upload

Photos are stored in `uploads/experiments/` with the naming pattern:
`{userId}_{challengeId}_{timestamp}.{extension}`

## Security Features

- JWT authentication required for all endpoints
- Role-based access control (Students, Instructors, Admins)
- File type validation (JPG, PNG only)
- File size limits (5MB max)
- Input sanitization and validation

## Usage Example

1. User calls `GET /challenges` to see available challenges
2. First challenge is automatically unlocked
3. User submits answer via `POST /challenges/:id/submit-answer`
4. If correct and has photo experiment, user submits photo via `POST /challenges/:id/submit-photo`
5. Challenge completes, next challenge unlocks
6. Process repeats for all 12 challenges