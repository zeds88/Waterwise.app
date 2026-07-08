import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from '../ui/Button';

export interface SignupData {
  firstName: string;
  email: string;
}

export default function SignupForm() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const valid = firstName.trim().length > 0 && emailValid;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    sessionStorage.setItem('signup', JSON.stringify({ firstName: firstName.trim(), email }));
    navigate('/onboarding/baseline');
  };

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="w-full max-w-md px-6 py-8 flex flex-col">
        <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-8">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Create your account</h1>
        <p className="text-slate-500 mb-8">Two fields and you're in. We'll size up your yard next.</p>

        <form onSubmit={submit} className="space-y-5 flex-1">
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700 mb-1.5">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {touched && !emailValid && email.length > 0 && (
              <p className="text-red-500 text-sm mt-1.5">Please enter a valid email address.</p>
            )}
          </div>

          <div className="pt-4">
            <Button type="submit" fullWidth disabled={touched && !valid}>
              Continue
            </Button>
          </div>
        </form>

        <p className="text-center text-slate-400 text-xs mt-6">
          Demo prototype — no data leaves your browser.
        </p>
      </div>
    </div>
  );
}
