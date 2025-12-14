# Tech Opportunity Hub

A comprehensive platform connecting tech enthusiasts with career opportunities, internships, training programs, and industry events. Built with modern web technologies and Firebase for real-time functionality.

## 🌐 Live Demo

[View the live project here](https://ndaziramiyep.github.io/Tech-Opportunity-Hub/)

## ✨ Features

### For All Users
- **Browse Opportunities**: Explore jobs, internships, training programs, and events
- **Advanced Filtering**: Filter by type (Job, Internship, Training, Event) and category (Web Dev, Mobile Dev, Data Science, AI/ML, Cybersecurity, Cloud)
- **Event Discovery**: Dedicated events section showcasing tech conferences, meetups, and workshops
- **Search & Filter**: Real-time filtering with multiple criteria
- **Responsive Design**: Fully responsive design that works on all devices

### For Registered Users
- **User Dashboard**: Personal dashboard to manage applications and saved opportunities
- **Application Tracking**: Track all your job/internship applications in one place
- **Save Opportunities**: Bookmark opportunities for later review
- **Profile Management**: Complete profile with skills, bio, and contact information
- **Notifications**: Receive updates on your applications and saved opportunities

### For Administrators
- **Admin Panel**: Comprehensive admin dashboard for platform management
- **Opportunity Management**: Create, edit, and delete opportunities
- **User Management**: Manage users, assign/remove admin privileges
- **Category Management**: Add, edit, and delete custom categories
- **Analytics Dashboard**: View platform statistics and metrics
- **Application Monitoring**: Track all applications across the platform

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account (for backend services)
- Web server (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Tech-Opportunity-Hub.git
   cd Tech-Opportunity-Hub
   ```

2. **Set up Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Firestore database
   - Enable Storage (if needed for future features)
   - Copy your Firebase configuration

3. **Configure Firebase**
   - Open `script.js`
   - Replace the `firebaseConfig` object with your Firebase project configuration:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID",
       measurementId: "YOUR_MEASUREMENT_ID"
   };
   ```

4. **Set up Firestore Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read their own data
       match /users/{userId} {
         allow read: if request.auth != null && request.auth.uid == userId;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Admins can read all users
       match /users/{userId} {
         allow read: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       
       // Opportunities are readable by all, writable by admins
       match /opportunities/{opportunityId} {
         allow read: if true;
         allow write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
       
       // Applications are readable by owner and admins
       match /applications/{applicationId} {
         allow read: if request.auth != null && 
           (resource.data.userId == request.auth.uid || 
            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
         allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
       }
       
       // Categories are readable by all, writable by admins
       match /categories/{categoryId} {
         allow read: if true;
         allow write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
       }
     }
   }
   ```

5. **Create Firestore Indexes** (if needed)
   - Go to Firestore → Indexes
   - Create composite indexes for:
     - Collection: `opportunities`
     - Fields: `status` (Ascending), `createdAt` (Descending)
     - Collection: `opportunities`
     - Fields: `status` (Ascending), `type` (Ascending), `createdAt` (Descending)

6. **Run the Application**
   - Open `index.html` in a web browser, or
   - Use a local web server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js (http-server)
     npx http-server
     
     # Using PHP
     php -S localhost:8000
     ```
   - Navigate to `http://localhost:8000`

## 📁 Project Structure

```
Tech-Opportunity-Hub/
│
├── index.html          # Main HTML file with all sections
├── script.js           # Main JavaScript file with all functionality
├── styles.css          # Complete styling and responsive design
├── README.md           # Project documentation
│
└── Sections:
    ├── Home            # Landing page with featured opportunities
    ├── Opportunities   # Browse all opportunities with filters
    ├── Events          # Dedicated events section
    ├── Dashboard       # User dashboard (applications, saved, profile)
    └── Admin Panel     # Admin management interface
```

## 🛠️ Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **UI Framework**: Custom CSS with modern design patterns
- **Icons**: Font Awesome 6.4.0
- **Firebase SDK**: Firebase v9.22.0 (Compat mode)

## 📋 Key Features Breakdown

### Authentication System
- Email/Password authentication
- User registration with profile creation
- Secure session management
- Role-based access control (User/Admin)

### Opportunity Management
- Create opportunities (Admin only)
- View opportunity details
- Filter by type and category
- Search functionality
- Save/bookmark opportunities
- Apply for opportunities

### User Dashboard
- View all applications
- Track application status
- Manage saved opportunities
- Update profile information
- View notifications

### Admin Panel
- Manage all opportunities
- User management with role assignment
- Category management
- Platform analytics
- Application monitoring

## 🎨 Design Features

- **Modern UI/UX**: Clean, professional design with smooth animations
- **Responsive Layout**: Mobile-first approach, works on all screen sizes
- **Accessibility**: Semantic HTML, proper ARIA labels
- **Loading States**: Visual feedback during data operations
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Non-intrusive notifications for user actions

## 🔐 Security Features

- Firebase Authentication for secure user management
- Firestore security rules for data protection
- Input validation on all forms
- XSS protection through proper data sanitization
- Role-based access control

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🚧 Future Enhancements

- [ ] Advanced search with full-text search
- [ ] Email notifications
- [ ] Resume upload functionality
- [ ] Company profiles
- [ ] Rating and review system
- [ ] Social sharing features
- [ ] Dark mode
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Export data functionality

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👥 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- Firebase team for excellent backend services
- Font Awesome for beautiful icons
- All contributors and users of this platform

## 📞 Support

For support, email support@techopportunityhub.com or open an issue in the GitHub repository.

## 📊 Project Status

✅ **Active Development** - The project is actively maintained and updated.

---

**Made with ❤️ for the tech community**
