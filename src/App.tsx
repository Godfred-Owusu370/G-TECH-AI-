import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Terminal, 
  BookOpen, 
  Cpu, 
  Lightbulb,
  ChevronRight,
  MessageSquare,
  PlusCircle,
  Trash2,
  Menu,
  X,
  Mic,
  MicOff,
  Paperclip,
  FileText,
  Image as ImageIcon,
  LogOut,
  Mail,
  Lock,
  AlertCircle,
  Settings,
  ArrowLeft,
  Camera,
  Save,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: { title: string; uri: string }[];
  files?: { name: string; type: string; data: string }[];
}

interface SelectedFile {
  name: string;
  type: string;
  data: string;
  preview?: string;
}

const SYSTEM_INSTRUCTION = `You are G-TECH AI, the official intelligent assistant of G-TECHNOLOGIES.
Your purpose is to provide accurate, professional, and educative assistance across all fields of knowledge, while maintaining strong expertise in Information Technology.

You are designed to educate, guide, and solve problems for users of all backgrounds—students, professionals, and general users.

🔹 Scope of Knowledge
You are not limited to a single domain. You can assist in:
- Information Technology (your core strength)
- Science and Engineering
- Mathematics
- Business and Entrepreneurship
- Education and Research
- General Knowledge and Everyday Problem-Solving

Always deliver highly detailed and expert-level support in IT-related topics.

🔹 Core Responsibilities
- Provide accurate, clear, and structured answers
- Explain concepts in a step-by-step, easy-to-understand manner
- Offer deep educational insights, not just surface answers
- Assist with: Problem-solving, Technical support, Coding and debugging, Research and explanations
- Provide real-world examples and practical applications

🔹 Communication Style
- Always maintain a professional, intelligent, and friendly tone
- Be educative and explanatory, like a skilled teacher
- Structure responses using: Headings, Bullet points, Step-by-step guides
- Adjust explanations based on the user’s level (beginner → advanced)

🔹 Teaching & Assistance Approach
Teach concepts by explaining: What it is, How it works, Why it matters.
When relevant, include: Examples, Analogies, Code snippets, Best practices.

🔹 Problem-Solving Mode
When a user asks for help:
1. Understand the problem clearly
2. Break it into smaller parts
3. Provide a logical, step-by-step solution
4. Offer improvements or alternatives

🔹 Brand Identity — G-TECHNOLOGIES
You represent G-TECHNOLOGIES as: Innovative, forward-thinking, a leader in technology and digital education, reliable, professional, and knowledge-driven.
Motto: "Empowering minds, solving problems, and shaping the future through technology."`;

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [view, setView] = useState<'chat' | 'settings'>('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Profile Edit State
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Theme Listener
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data();
          setUserProfile(profile);
          setEditDisplayName(profile.displayName || '');
          setEditBio(profile.bio || '');
          setEditAvatarUrl(profile.avatarUrl || '');
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSavingProfile(true);
    setSaveSuccess(false);
    
    try {
      const updatedProfile = {
        ...userProfile,
        displayName: editDisplayName,
        bio: editBio,
        avatarUrl: editAvatarUrl,
      };
      
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      setUserProfile(updatedProfile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Profile update error:", error);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile in Firestore
        const initialProfile = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: '',
          avatarUrl: '',
          bio: '',
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', userCredential.user.uid), initialProfile);
        setUserProfile(initialProfile);
        setEditDisplayName('');
        setEditAvatarUrl('');
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      setAuthError(error.message || "An error occurred during authentication.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const initialProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          avatarUrl: user.photoURL || '',
          bio: '',
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'users', user.uid), initialProfile);
        setUserProfile(initialProfile);
        setEditDisplayName(user.displayName || '');
        setEditAvatarUrl(user.photoURL || '');
      } else {
        // If profile exists, check if we should update missing fields from Google
        const existingProfile = userDoc.data();
        let needsUpdate = false;
        const updates: any = {};
        
        if (!existingProfile.displayName && user.displayName) {
          updates.displayName = user.displayName;
          needsUpdate = true;
        }
        if (!existingProfile.avatarUrl && user.photoURL) {
          updates.avatarUrl = user.photoURL;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
          const updatedProfile = { ...existingProfile, ...updates };
          setUserProfile(updatedProfile);
          if (updates.displayName) setEditDisplayName(updates.displayName);
          if (updates.avatarUrl) setEditAvatarUrl(updates.avatarUrl);
        } else {
          setUserProfile(existingProfile);
          setEditDisplayName(existingProfile.displayName || '');
          setEditAvatarUrl(existingProfile.avatarUrl || '');
        }
      }
    } catch (error: any) {
      console.error("Google Auth error:", error);
      setAuthError(error.message || "An error occurred during Google Sign-In.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMessages([]);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(prev => prev + ' ' + transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: SelectedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const fileData = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const base64Data = fileData.split(',')[1];
      
      newFiles.push({
        name: file.name,
        type: file.type,
        data: base64Data,
        preview: file.type.startsWith('image/') ? fileData : undefined
      });
    }

    setSelectedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      files: selectedFiles.length > 0 ? selectedFiles.map(f => ({ name: f.name, type: f.type, data: f.data })) : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentFiles = [...selectedFiles];
    setInput('');
    setSelectedFiles([]);
    setIsLoading(true);
    if (isRecording) recognitionRef.current?.stop();

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Prepare parts for the current message
      const parts: any[] = [];
      if (currentInput.trim()) {
        parts.push({ text: currentInput });
      }
      
      currentFiles.forEach(file => {
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: file.data
          }
        });
      });

      // Prepare history
      const history = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Add the current user message to history
      history.push({
        role: 'user',
        parts: parts
      });

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-pro-preview",
        contents: history,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ googleSearch: {} }],
        },
      });

      let assistantContent = '';

      for await (const chunk of responseStream) {
        const text = chunk.text;
        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
        
        if (text || groundingMetadata) {
          assistantContent += text || '';
          
          let sources: { title: string; uri: string }[] | undefined = undefined;
          if (groundingMetadata?.groundingChunks) {
            sources = groundingMetadata.groundingChunks
              .filter(chunk => chunk.web)
              .map(chunk => ({
                title: chunk.web!.title,
                uri: chunk.web!.uri,
              }));
          }

          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { 
                  ...msg, 
                  content: assistantContent,
                  sources: sources || msg.sources 
                } 
              : msg
          ));
        }
      }
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error while processing your request. Please try again or contact G-TECHNOLOGIES support if the issue persists.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setIsSidebarOpen(false);
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 p-8"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
              <Cpu className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">G-TECH AI</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {authMode === 'login' ? 'Welcome back to G-TECHNOLOGIES' : 'Create your G-TECH account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium border border-red-100 dark:border-red-900/30">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {authError}
              </div>
            )}

            <button 
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Or continue with</span>
            <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800"></div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={isAuthLoading}
            className="w-full mt-6 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 rounded-2xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-70"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">G-TECH AI</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">G-TECHNOLOGIES</p>
            </div>
          </div>

          <button 
            onClick={clearChat}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium mb-6"
          >
            <PlusCircle className="w-5 h-5 text-blue-400" />
            New Session
          </button>

          <div className="flex-1 overflow-y-auto space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Capabilities</p>
            <div className="space-y-1">
              {[
                { icon: Terminal, label: "IT & Coding", color: "text-emerald-400" },
                { icon: BookOpen, label: "Education", color: "text-blue-400" },
                { icon: Lightbulb, label: "Problem Solving", color: "text-amber-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg text-slate-300 text-sm">
                  <item.icon className={cn("w-4 h-4", item.color)} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-medium mb-2"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-5 h-5" />
                  Dark Mode
                </>
              ) : (
                <>
                  <Sun className="w-5 h-5" />
                  Light Mode
                </>
              )}
            </button>
            <button 
              onClick={() => {
                setView('settings');
                setIsSidebarOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 w-full p-3 rounded-xl transition-all text-sm font-medium mb-2",
                view === 'settings' ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-medium mb-4"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
            <div className="p-4 bg-slate-800/50 rounded-2xl">
              <p className="text-[10px] text-slate-400 italic leading-relaxed">
                "Empowering minds, solving problems, and shaping the future through technology."
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {view === 'chat' ? (
          <>
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30 transition-colors duration-300">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden"
                >
                  <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">G-TECH AI Online</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {userProfile?.displayName && (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden md:inline">
                    Welcome, {userProfile.displayName}
                  </span>
                )}
                <button 
                  onClick={clearChat}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  title="Clear Chat"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Chat Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
                  <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-3xl flex items-center justify-center mb-2">
                    <Bot className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">How can G-TECH assist you today?</h2>
                    <p className="text-slate-500 dark:text-slate-400">
                      I am your intelligent assistant from G-TECHNOLOGIES. I can help with coding, 
                      technical support, research, and educational guidance across all fields.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                    {[
                      "Explain how React hooks work",
                      "Help me debug a Python script",
                      "What are the latest trends in AI?",
                      "Explain Quantum Computing for beginners"
                    ].map((suggestion, i) => (
                      <button 
                        key={i}
                        onClick={() => setInput(suggestion)}
                        className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-left text-sm text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span>{suggestion}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover:text-blue-400 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-8 pb-12">
                  {messages.map((msg) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4 md:gap-6",
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        msg.role === 'user' ? "bg-slate-900 dark:bg-slate-800" : "bg-blue-600"
                      )}>
                        {msg.role === 'user' ? (
                          <User className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className={cn(
                        "flex flex-col max-w-[85%] md:max-w-[75%]",
                        msg.role === 'user' ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "p-4 md:p-6 rounded-3xl shadow-sm",
                          msg.role === 'user' 
                            ? "bg-slate-900 dark:bg-blue-600 text-white rounded-tr-none" 
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                        )}>
                          {msg.files && msg.files.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {msg.files.map((file, idx) => (
                                <div key={idx} className="relative group">
                                  {file.type.startsWith('image/') ? (
                                    <img 
                                      src={`data:${file.type};base64,${file.data}`} 
                                      alt={file.name}
                                      className="w-32 h-32 object-cover rounded-xl border border-slate-700 dark:border-slate-600"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2 p-3 bg-slate-800 dark:bg-slate-950 rounded-xl border border-slate-700 dark:border-slate-600">
                                      <FileText className="w-5 h-5 text-blue-400" />
                                      <span className="text-xs truncate max-w-[100px] text-slate-200">{file.name}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="markdown-body">
                            <Markdown>{msg.content}</Markdown>
                          </div>

                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Sources</p>
                              <div className="flex flex-wrap gap-2">
                                {msg.sources.map((source, idx) => (
                                  <a 
                                    key={idx}
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                                  >
                                    {source.title}
                                    <ChevronRight className="w-2 h-2" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium px-1">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-4 md:gap-6">
                      <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 animate-pulse">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">G-TECH AI is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 bg-gradient-to-t from-slate-50 dark:from-slate-950 via-slate-50 dark:via-slate-950 to-transparent transition-colors duration-300">
              <div className="max-w-4xl mx-auto relative">
                {/* File Previews */}
                <AnimatePresence>
                  {selectedFiles.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex flex-wrap gap-2 mb-3 p-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800"
                    >
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="relative group">
                          {file.preview ? (
                            <img 
                              src={file.preview} 
                              alt={file.name}
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-16 h-16 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                              <FileText className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                              <span className="text-[8px] text-slate-500 dark:text-slate-400 truncate w-full text-center">{file.name}</span>
                            </div>
                          )}
                          <button 
                            onClick={() => removeFile(idx)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative group">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={isRecording ? "Listening..." : "Ask G-TECH AI anything..."}
                    className={cn(
                      "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl py-4 pl-14 pr-24 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xl shadow-slate-200/50 dark:shadow-black/50 resize-none min-h-[60px] max-h-[200px]",
                      isRecording && "border-blue-500 ring-2 ring-blue-500/20"
                    )}
                    rows={1}
                  />
                  
                  <div className="absolute left-2 bottom-2 flex items-center gap-1">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                      title="Upload Files"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      multiple
                      className="hidden"
                    />
                  </div>

                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button 
                      onClick={toggleRecording}
                      className={cn(
                        "p-3 rounded-2xl transition-all",
                        isRecording 
                          ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 animate-pulse" 
                          : "text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      )}
                      title={isRecording ? "Stop Recording" : "Voice Input"}
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={handleSend}
                      disabled={(!input.trim() && selectedFiles.length === 0) || isLoading}
                      className={cn(
                        "p-3 rounded-2xl transition-all",
                        (input.trim() || selectedFiles.length > 0) && !isLoading 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"
                      )}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-3 font-medium">
                  G-TECH AI may provide educational insights. Verify critical information.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center px-4 sticky top-0 z-30">
              <button 
                onClick={() => setView('chat')}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg mr-4"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile Settings</h2>
            </header>

            <div className="max-w-2xl mx-auto p-6 md:p-12">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 p-8"
              >
                <div className="flex flex-col items-center mb-10">
                  <div className="relative group">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      {editAvatarUrl ? (
                        <img src={editAvatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg cursor-pointer hover:bg-blue-700 transition-colors">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-4">{userProfile?.displayName || 'Your Profile'}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{user?.email}</p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">Display Name</label>
                    <input 
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">Bio</label>
                    <textarea 
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none h-24"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1">Avatar URL</label>
                    <input 
                      type="url"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isSavingProfile}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70",
                        saveSuccess ? "bg-emerald-500 text-white shadow-emerald-500/30" : "bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700"
                      )}
                    >
                      {isSavingProfile ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : saveSuccess ? (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Profile Saved
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
