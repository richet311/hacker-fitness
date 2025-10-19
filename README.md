# HackerFitness 🏋️

A comprehensive fitness tracking application with AI-powered personalized meal plans and workout optimization using free, open-source LLMs.

## Features

✨ **User Authentication**: Secure authentication with Clerk
📊 **Personalized Dashboard**: Track your metrics and fitness goals
🤖 **AI-Powered Coaching**: AI assistant powered by Hugging Face's free inference API
  - **Meals & Macros AI**: Personalized meal plans and nutritional guidance
💪 **Automatic Macro Calculation**: BMR and TDEE calculations based on your metrics (with optional AI enhancement)
🎯 **Goal-Based Planning**: Support for weight loss, muscle gain, maintenance, and endurance
📈 **Metrics Tracking**: Track age, weight, height, activity level, and fitness goals
🆓 **100% Free**: No API costs - uses Hugging Face's free tier with fallback calculations

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: React 19, Tailwind CSS, Radix UI components
- **Authentication**: Clerk
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Hugging Face Inference API (Mistral-7B-Instruct) with scientific fallback
- **Form Handling**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. PostgreSQL database
3. Clerk account (for authentication)

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="your_postgresql_connection_string"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"
```

**Note**: No API keys needed for the LLM! It uses Hugging Face's free inference API with a robust fallback system.

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up the database:

```bash
npx prisma generate
npx prisma migrate dev
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser

## User Flow

1. **Sign Up**: New users are redirected to sign up and then to the metrics page
2. **Enter Metrics**: Users fill in their age, weight, height, sex, activity level, and fitness goal
3. **Dashboard**: After submitting metrics, users are redirected to their personalized dashboard
4. **AI Coaching**: Users can interact with two AI assistants:
   - **Meals & Macros**: Get personalized meal plans based on fitness goals
   - **Workout Timeline**: Get workout optimization tips and training advice

## API Endpoints

### User Profile
- `POST /api/user-profile` - Create/update user profile and metrics
- `GET /api/user-profile` - Fetch user profile and metrics

### AI Assistants
- `POST /api/llm/meals` - Get meal and macro recommendations (uses Hugging Face or fallback calculation)

## Database Schema

The application uses Prisma with PostgreSQL. Key models:
- `User`: User account information (linked to Clerk)
- `UserProfile`: User metrics and fitness goals
- `Workout`: Workout tracking
- `Exercise`: Individual exercises within workouts
- `NutritionEntry`: Food and macro tracking
- `Goal`: Goal setting and tracking
- `Achievement`: Milestones and achievements

## AI & Macro Calculation System

The app uses a **dual-approach** system for maximum reliability:

1. **Primary**: Hugging Face's free Mistral-7B-Instruct model (when available)
2. **Fallback**: Scientific calculation using Mifflin-St Jeor equation

**Meals & Macros AI**: Responds to queries about:
- Meal planning
- Nutritional macros
- Diet suggestions
- Calorie recommendations

The system automatically switches to the scientifically-accurate fallback if the LLM is unavailable, ensuring users always get accurate macro calculations.

## Macro Calculation

The app calculates personalized macros using:

1. **BMR (Basal Metabolic Rate)**: Mifflin-St Jeor Equation
   - Men: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age + 5
   - Women: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age - 161

2. **TDEE (Total Daily Energy Expenditure)**: BMR × Activity Multiplier
   - Light: 1.375
   - Moderate: 1.55
   - Active: 1.725
   - Very Active: 1.9

3. **Goal-Based Adjustments**:
   - Weight Loss: 20% calorie deficit
   - Muscle Gain: 10% calorie surplus
   - Maintenance: TDEE calories
   - Endurance: 5% calorie surplus

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
