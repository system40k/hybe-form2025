# HYBE Fan-Permit Email OTP Verification System

A secure fan registration system with email verification using 6-digit OTP codes.

## 🎯 Features

- **Email OTP Verification**: Users must verify their email before submitting the form
- **Secure Storage**: Supabase database with encrypted OTP storage
- **Rate Limiting**: Multi-tier protection against abuse (email + IP based)
- **Brute Force Protection**: Progressive lockouts after failed attempts
- **Temporary Email Blocking**: Blocks known disposable email services
- **Security Headers**: HSTS, CSP, XSS protection, and more
- **Responsive Design**: Mobile-friendly form with Bootstrap 5

## 📁 Project Structure

```
├── lib/                      # Core libraries
│   ├── otp-service.js        # OTP generation and verification
│   ├── security.js           # Security utilities and configuration
│   └── supabaseClient.js     # Supabase database client
├── netlify/functions/        # Serverless functions for Netlify
│   ├── otp-send.js          # Send OTP via email
│   ├── otp-verify.js        # Verify OTP code
│   └── submit-form.js       # Process form submission
├── tests/                    # E2E tests
│   ├── e2e-flow.spec.js     # Full user journey tests
│   └── otp-verification.spec.js  # OTP-specific tests
├── dist/                     # Production build output
├── index.html               # Main HTML file
├── script.js                # Frontend JavaScript
├── styles.css               # Custom styles
├── server.js                # Express development server
├── netlify.toml             # Netlify configuration
└── .env.example             # Environment variables template
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Resend API key (for email sending)

### Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key
   - `SUPABASE_SERVICE_KEY`: Supabase service role key
   - `RESEND_API_KEY`: Resend email API key
   - `EMAIL_FROM`: Sender email address

3. **Set up Supabase database**
   
   Create an `otp_verifications` table:
   ```sql
   CREATE TABLE otp_verifications (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     email TEXT UNIQUE NOT NULL,
     otp_code TEXT NOT NULL,
     verified BOOLEAN DEFAULT false,
     created_at TIMESTAMP DEFAULT NOW(),
     expires_at TIMESTAMP NOT NULL,
     attempts INTEGER DEFAULT 0,
     max_attempts INTEGER DEFAULT 3
   );
   
   CREATE INDEX idx_otp_email ON otp_verifications(email);
   CREATE INDEX idx_otp_expires ON otp_verifications(expires_at);
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```
   
   Open http://localhost:5173 in your browser.

5. **Build for production**
   ```bash
   npm run build
   ```

## 🧪 Testing

### Run E2E Tests
```bash
# Install Playwright browsers
npx playwright install

# Run tests
npm run test:e2e
```

### Manual Testing
- See `OTP_TESTING_GUIDE.md` for detailed OTP testing instructions
- See `E2E_TESTING_GUIDE.md` for end-to-end testing scenarios

## 🔒 Security Features

### OTP Security
- Cryptographically secure random generation
- 6-digit numeric codes
- 10-minute expiration
- Maximum 3 verification attempts per code

### Rate Limiting
- **OTP Requests**: 3 per 5 minutes per email
- **Verification Attempts**: 10 per 15 minutes per IP
- **Progressive Lockouts**: 30-minute cooldown after exceeding limits

### Input Validation
- RFC 5322 compliant email validation
- Temporary email domain blocking
- XSS and injection prevention
- Input sanitization on all fields

### Security Headers
- Content-Security-Policy (CSP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security (HSTS)

## 📊 User Flow

1. User fills out subscription form
2. On submit, OTP verification modal appears
3. User enters email → receives 6-digit code
4. User enters code → system verifies
5. On success, form submits automatically
6. User redirected to success page

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Required |
| `VITE_SUPABASE_ANON_KEY` | Supabase public key | Required |
| `SUPABASE_SERVICE_KEY` | Supabase service key | Required |
| `RESEND_API_KEY` | Resend email API key | Required |
| `EMAIL_FROM` | Sender email | `onboarding@resend.dev` |
| `OTP_RATE_LIMIT_MAX_REQUESTS` | Max OTP requests | 3 |
| `OTP_RATE_LIMIT_TIME_WINDOW` | Rate limit window (ms) | 300000 |
| `VERIFICATION_RATE_LIMIT_MAX_ATTEMPTS` | Max verify attempts | 10 |
| `BLOCKED_EMAIL_DOMAINS` | Comma-separated blocked domains | Built-in list |

## 📄 Documentation

- `IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- `SECURITY_AUDIT.md` - Initial security assessment
- `SECURITY_AUDIT_POST_DB.md` - Post-database security audit
- `OTP_TESTING_GUIDE.md` - OTP testing procedures
- `E2E_TESTING_GUIDE.md` - End-to-end testing guide

## 🌐 Deployment

### Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables in Netlify dashboard
5. Deploy

The `netlify.toml` file handles routing and function configuration automatically.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test:e2e`
5. Run linter: `npm run lint`
6. Format code: `npm run format`
7. Submit a pull request

## 📝 License

ISC

## 📞 Support

For issues or questions, please open an issue on GitHub.
