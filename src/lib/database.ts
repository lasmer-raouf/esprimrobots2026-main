// Legacy interface - no longer used for authentication
export interface Member {
  id: string | number;
  email: string;
  name: string;
  major?: string;
  bio?: string;
  image?: string;
}

export interface Task {
  id: number;
  text: string;
  completed: boolean;
}

export interface PendingMember {
  id: number;
  name: string;
  email: string;
  major: string;
  reason: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  status: 'In Progress' | 'Completed';
  image?: string;
}

export interface CompetitionRobot {
  id: number;
  name: string;
  description: string;
  slots: number;
  signups: (string | number)[];
}

export interface Message {
  id: number;
  from: string | number;
  to: string | number | 'admin';
  content: string;
  timestamp: number;
  read: boolean;
}

export interface Announcement {
  id: number;
  content: string;
  date: number;
}

export interface ClubDatabase {
  settings: {
    videoFilename: string;
    showApplyBtn: boolean;
    showInterviewBtn: boolean;
    showResultBtn: boolean;
  };
  pendingMembers: PendingMember[];
  projects: Project[];
  competitionRobots: CompetitionRobot[];
  announcements: Announcement[];
  messages: Message[];
}

const defaultDatabase: ClubDatabase = {
  settings: {
    videoFilename: 'hero-video.mp4',
    showApplyBtn: true,
    showInterviewBtn: false,
    showResultBtn: false,
  },
  pendingMembers: [],
  projects: [
    {
      id: 1,
      title: 'Autonomous Line Following Robot',
      description: 'A robot capable of following a black line on a white surface using infrared sensors.',
      status: 'Completed',
    },
    {
      id: 2,
      title: 'Robotic Arm with AI Vision',
      description: '6-axis robotic arm with computer vision for object recognition and manipulation.',
      status: 'In Progress',
    },
    {
      id: 3,
      title: 'Maze Solving Robot',
      description: 'Autonomous robot that can navigate and solve complex mazes using ultrasonic sensors.',
      status: 'In Progress',
    },
  ],
  competitionRobots: [
    {
      id: 1,
      name: 'AlphaBot',
      description: 'Main competition robot for international robotics challenge.',
      slots: 5,
      signups: [7],
    },
    {
      id: 2,
      name: 'BetaDrone',
      description: 'Aerial robotics platform for drone competition.',
      slots: 3,
      signups: [],
    },
    {
      id: 3,
      name: 'GammaCrawler',
      description: 'All-terrain exploration robot for rescue missions.',
      slots: 4,
      signups: [],
    },
  ],
  announcements: [
    {
      id: 1,
      content: 'Welcome to ESPRIM ROBOTS! Applications are now open for new members.',
      date: Date.now(),
    },
  ],
  messages: [],
};

function loadDatabase(): ClubDatabase {
  const saved = localStorage.getItem('clubDB');
  if (saved) {
    return JSON.parse(saved);
  }
  return defaultDatabase;
}

export function saveDatabase(): void {
  localStorage.setItem('clubDB', JSON.stringify(clubDB));
}

export const clubDB = loadDatabase();
