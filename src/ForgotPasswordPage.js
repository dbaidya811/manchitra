import React, { useState, useRef } from 'react';

const ForgotPasswordPage = ({ setCurrentView }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSendOtp = () => {
    if (!email) {
      alert('Please enter your email address.');
      return;
    }
    alert('An OTP has been sent to ' + email);
    setStep(2);
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return; // Allow only numbers
    const newOtp = [...otpValues];
    newOtp[index] = value.substring(value.length - 1); // Take only the last typed character
    setOtpValues(newOtp);

    // Move focus to next input if a digit is entered
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Move focus to previous input on Backspace if current is empty
    if (e.key === 'Backspace' && !otpValues[index] && index > 0 && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = () => {
    const otpCode = otpValues.join('');
    if (otpCode.length < 6) {
      alert('Please enter the 6-digit OTP.');
      return;
    }
    // For demo purposes, accepting any OTP or a specific one like '123456'
    if (otpCode === '123456') {
      setStep(3);
    } else {
      alert('Invalid OTP. Please try again.');
    }
  };

  const handleResetPassword = () => {
    if (!newPassword || !confirmPassword) {
      alert('Please fill in both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match. Please try again.');
      return;
    }
    alert('Password reset successfully! You can now login.');
    setCurrentView('login');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {step === 1 && (
          <>
            <div className="auth-header">
              <h2>Reset Password</h2>
              <p>Enter your email to receive an OTP</p>
            </div>
            <div className="auth-input-group">
              <label>Email Address</label>
              <input type="email" placeholder="Enter your registered email" className="auth-input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="auth-btn" onClick={handleSendOtp}>Send OTP</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="auth-header">
              <h2>Verify OTP</h2>
              <p>Enter the OTP sent to <br/><strong>{email}</strong></p>
            </div>
            <div className="auth-input-group">
              <label style={{ textAlign: 'center' }}>Enter 6-digit OTP</label>
              <div className="otp-container">
                {otpValues.map((value, index) => (
                  <input
                    key={index}
                    type="text"
                    className="otp-input"
                    value={value}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    ref={(el) => (otpRefs.current[index] = el)}
                  />
                ))}
              </div>
            </div>
            <button className="auth-btn" onClick={handleVerifyOtp}>Verify OTP</button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="auth-header">
              <h2>Set New Password</h2>
              <p>Create a new strong password</p>
            </div>
            <div className="auth-input-group">
              <label>New Password</label>
              <input type="password" placeholder="Enter new password" className="auth-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="auth-input-group">
              <label>Confirm Password</label>
              <input type="password" placeholder="Confirm new password" className="auth-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button className="auth-btn" onClick={handleResetPassword}>Update Password</button>
          </>
        )}

        <div className="auth-link-center" style={{ marginTop: '20px' }}>
          <span className="auth-link" onClick={() => setCurrentView('login')}>
            ← Back to Login
          </span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;