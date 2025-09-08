# Challenge System Implementation Guide

## Overview
This document outlines the implementation of a text-based challenge system with optional photo experiments for electrical engineering education. The system was redesigned from multiple choice + photo submission types to a unified text input approach with conditional photo experiments.

## System Architecture Changes Made

### Flutter App Changes (COMPLETED)
- **Removed**: `ChallengeType` enum (multipleChoice, photoSubmission)
- **Added**: `hasPhotoExperiment` boolean flag to Challenge entity
- **Modified**: Challenge entity now has:
  - `question`: String - The question to ask the user
  - `correctAnswer`: String - Expected answer
  - `hasPhotoExperiment`: Boolean - Flag for photo experiment requirement
  - `photoPrompt`: String? - Instructions for photo experiment (if applicable)
- **Updated**: Challenge flow now has two steps:
  1. Answer text question
  2. Submit photo experiment (if `hasPhotoExperiment` is true)

### Challenge Data Structure
```dart
class Challenge {
  final String id;
  final String title;
  final String description;
  final String question; // NEW: The question to ask
  final String correctAnswer; // NEW: Expected answer
  final DifficultyLevel difficulty;
  final ChallengeStatus status;
  final bool hasPhotoExperiment; // NEW: Photo experiment flag
  final String? photoPrompt; // NEW: Photo experiment instructions
  final int order;
}
```

## NestJS Server Implementation Requirements

### 1. Database Entities

#### Challenge Entity
```typescript
@Entity('challenges')
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('text')
  question: string;

  @Column()
  correctAnswer: string;

  @Column({
    type: 'enum',
    enum: ['easy', 'medium', 'hard', 'expert']
  })
  difficulty: string;

  @Column({ default: false })
  hasPhotoExperiment: boolean;

  @Column('text', { nullable: true })
  photoPrompt: string;

  @Column()
  order: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### User Challenge Progress Entity
```typescript
@Entity('user_challenge_progress')
export class UserChallengeProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  challengeId: string;

  @Column({
    type: 'enum',
    enum: ['locked', 'unlocked', 'completed'],
    default: 'locked'
  })
  status: string;

  @Column({ nullable: true })
  userAnswer: string;

  @Column({ nullable: true })
  isAnswerCorrect: boolean;

  @Column({ nullable: true })
  photoUrl: string;

  @Column({ nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Challenge)
  @JoinColumn({ name: 'challengeId' })
  challenge: Challenge;
}
```

### 2. API Endpoints

```typescript
// GET /api/challenges
// Returns challenges with user progress
@Get()
async getChallenges(@Request() req): Promise<ChallengeResponseDto[]>

// GET /api/challenges/:id
// Returns specific challenge with user progress
@Get(':id')
async getChallengeById(@Param('id') id: string, @Request() req): Promise<ChallengeResponseDto>

// POST /api/challenges/:id/submit-answer
// Submit text answer
@Post(':id/submit-answer')
async submitAnswer(
  @Param('id') challengeId: string,
  @Body() submitAnswerDto: SubmitAnswerDto,
  @Request() req
): Promise<SubmissionResultDto>

// POST /api/challenges/:id/submit-photo
// Submit experiment photo
@Post(':id/submit-photo')
@UseInterceptors(FileInterceptor('photo'))
async submitPhoto(
  @Param('id') challengeId: string,
  @UploadedFile() file: Express.Multer.File,
  @Request() req
): Promise<SubmissionResultDto>
```

### 3. DTOs

#### Request DTOs
```typescript
export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  answer: string;
}
```

#### Response DTOs
```typescript
export class ChallengeResponseDto {
  id: string;
  title: string;
  description: string;
  question: string;
  difficulty: string;
  status: string;
  hasPhotoExperiment: boolean;
  photoPrompt?: string;
  order: number;
  userProgress?: {
    status: string;
    userAnswer?: string;
    isAnswerCorrect?: boolean;
    photoUrl?: string;
    completedAt?: Date;
  };
}

export class SubmissionResultDto {
  success: boolean;
  isCorrect?: boolean;
  message: string;
  nextChallengeUnlocked?: boolean;
  requiresPhotoExperiment?: boolean;
}
```

### 4. Business Logic Requirements

#### Answer Validation
- Case-insensitive comparison
- Trim whitespace from both user answer and correct answer
- Support for multiple acceptable answers (comma-separated)

#### Challenge Progression
1. Users start with only first challenge unlocked
2. Correct answer submission unlocks next challenge OR shows photo experiment step
3. For challenges with `hasPhotoExperiment: true`:
   - First: Submit correct text answer
   - Then: Submit photo experiment
   - Only after both steps: Challenge is completed and next unlocked
4. For challenges with `hasPhotoExperiment: false`:
   - Correct answer immediately completes challenge and unlocks next

#### Photo Upload
- Accept JPG, PNG formats
- Max file size: 5MB
- Store in cloud storage (AWS S3) or local storage
- Generate unique filenames to prevent conflicts

### 5. Challenge Data (12 Electrical Engineering Challenges)

```typescript
const challengeSeeds = [
  {
    id: '1',
    title: 'Basic Circuit Components',
    description: 'Learn about the fundamental components used in electrical circuits.',
    question: 'What are the four basic passive components in electrical circuits?',
    correctAnswer: 'resistor, capacitor, inductor, diode',
    difficulty: 'easy',
    order: 1,
    hasPhotoExperiment: false
  },
  {
    id: '2',
    title: 'Ohm\'s Law Calculation',
    description: 'Apply Ohm\'s law to calculate current in a simple circuit.',
    question: 'Calculate the current (in Amperes) in a circuit with 12V voltage and 4Ω resistance. (Enter only the number)',
    correctAnswer: '3',
    difficulty: 'easy',
    order: 2,
    hasPhotoExperiment: false
  },
  {
    id: '3',
    title: 'LED Circuit Experiment',
    description: 'Build a simple LED circuit and understand current limiting.',
    question: 'What component is essential to prevent an LED from burning out in a circuit?',
    correctAnswer: 'resistor',
    difficulty: 'easy',
    order: 3,
    hasPhotoExperiment: true,
    photoPrompt: 'Build a simple LED circuit with a resistor and battery. Take a photo showing the LED lit up with all components clearly visible.'
  },
  {
    id: '4',
    title: 'Parallel Resistance',
    description: 'Calculate equivalent resistance in parallel circuits.',
    question: 'What is the total resistance (in Ohms) of three 6Ω resistors connected in parallel? (Enter only the number)',
    correctAnswer: '2',
    difficulty: 'medium',
    order: 4,
    hasPhotoExperiment: false
  },
  {
    id: '5',
    title: 'Capacitor Behavior',
    description: 'Understand how capacitors behave in RC circuits.',
    question: 'In an RC charging circuit, how does the voltage across the capacitor change over time?',
    correctAnswer: 'increases exponentially',
    difficulty: 'medium',
    order: 5,
    hasPhotoExperiment: false
  },
  {
    id: '6',
    title: 'Voltage Divider Analysis',
    description: 'Design and analyze voltage divider circuits.',
    question: 'In a voltage divider with R1=1kΩ and R2=2kΩ connected to 9V, what is the output voltage (in Volts) across R2? (Enter only the number)',
    correctAnswer: '6',
    difficulty: 'medium',
    order: 6,
    hasPhotoExperiment: true,
    photoPrompt: 'Build the voltage divider circuit described in the question and measure the output voltage with a multimeter. Show your circuit and measurement.'
  },
  {
    id: '7',
    title: 'Transistor Function',
    description: 'Understand the role of transistors in amplification.',
    question: 'What is the primary function of a BJT transistor in amplifier circuits?',
    correctAnswer: 'amplify signals',
    difficulty: 'hard',
    order: 7,
    hasPhotoExperiment: false
  },
  {
    id: '8',
    title: 'Op-Amp Gain Calculation',
    description: 'Calculate gain in operational amplifier configurations.',
    question: 'In an inverting op-amp with Rf=10kΩ and Rin=1kΩ, what is the voltage gain? (Enter the number with sign)',
    correctAnswer: '-10',
    difficulty: 'hard',
    order: 8,
    hasPhotoExperiment: false
  },
  {
    id: '9',
    title: 'Op-Amp Circuit Build',
    description: 'Build and test an operational amplifier circuit.',
    question: 'What type of op-amp configuration inverts the input signal?',
    correctAnswer: 'inverting amplifier',
    difficulty: 'hard',
    order: 9,
    hasPhotoExperiment: true,
    photoPrompt: 'Build an inverting op-amp circuit and demonstrate its operation. Show input and output waveforms or voltage measurements.'
  },
  {
    id: '10',
    title: 'Filter Design Theory',
    description: 'Design filters for signal processing applications.',
    question: 'What type of filter removes high-frequency noise from a signal?',
    correctAnswer: 'low-pass filter',
    difficulty: 'expert',
    order: 10,
    hasPhotoExperiment: false
  },
  {
    id: '11',
    title: 'Microcontroller Programming',
    description: 'Program microcontrollers for digital control applications.',
    question: 'What programming concept is used to repeatedly check the state of a button in microcontroller code?',
    correctAnswer: 'polling',
    difficulty: 'expert',
    order: 11,
    hasPhotoExperiment: true,
    photoPrompt: 'Build a microcontroller circuit that controls an LED with a button press. Show your working circuit with code uploaded.'
  },
  {
    id: '12',
    title: 'Power Electronics',
    description: 'Understand switching power supply principles.',
    question: 'In a buck converter, what happens to the output voltage when the duty cycle increases?',
    correctAnswer: 'increases',
    difficulty: 'expert',
    order: 12,
    hasPhotoExperiment: false
  }
];
```

### 6. File Structure
```
src/
├── challenges/
│   ├── entities/
│   │   ├── challenge.entity.ts
│   │   └── user-challenge-progress.entity.ts
│   ├── dto/
│   │   ├── challenge-response.dto.ts
│   │   ├── submit-answer.dto.ts
│   │   └── submission-result.dto.ts
│   ├── challenges.controller.ts
│   ├── challenges.service.ts
│   └── challenges.module.ts
├── common/
│   ├── config/
│   │   └── multer.config.ts
│   └── guards/
│       └── jwt-auth.guard.ts
└── database/
    └── seeds/
        └── challenges.seed.ts
```

### 7. Environment Variables
```env
# File Upload
MAX_FILE_SIZE=5242880  # 5MB
UPLOAD_PATH=./uploads/experiments
ALLOWED_FILE_TYPES=jpg,jpeg,png

# Challenge Settings
ENABLE_CASE_SENSITIVE_ANSWERS=false
AUTO_UNLOCK_NEXT_CHALLENGE=true

# AWS S3 (if using cloud storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket_name
AWS_S3_REGION=your_region
```

### 8. Key Implementation Notes

#### Answer Validation Logic
```typescript
private validateAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalizeAnswer = (answer: string) => 
    answer.toLowerCase().trim().replace(/\s+/g, ' ');
  
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer);
}
```

#### Challenge Progression Logic
```typescript
async submitAnswer(challengeId: string, userId: string, answer: string) {
  // 1. Validate answer
  // 2. Update user progress
  // 3. If correct and hasPhotoExperiment: return requiresPhotoExperiment: true
  // 4. If correct and !hasPhotoExperiment: complete challenge and unlock next
  // 5. If incorrect: return error message
}

async submitPhoto(challengeId: string, userId: string, file: File) {
  // 1. Validate user has correct answer already
  // 2. Upload photo to storage
  // 3. Complete challenge
  // 4. Unlock next challenge
}
```

### 9. Testing Checklist
- [ ] User can answer text questions
- [ ] Case-insensitive answer validation works
- [ ] Photo experiments show after correct answers
- [ ] Challenge progression works correctly
- [ ] File upload security is implemented
- [ ] Only unlocked challenges are accessible
- [ ] Progress tracking is accurate

### 10. Security Considerations
- JWT authentication on all endpoints
- File upload validation (type, size, content)
- Rate limiting on submissions
- Input sanitization
- SQL injection prevention
- CORS configuration

---

## Implementation Priority
1. Database entities and migrations
2. Basic CRUD operations
3. Answer submission and validation
4. Challenge progression logic
5. Photo upload functionality
6. Security and validation
7. Testing and optimization

This system provides a more educational and engaging experience by requiring users to think and type answers rather than just selecting from multiple choices, while maintaining the hands-on learning aspect through optional photo experiments.