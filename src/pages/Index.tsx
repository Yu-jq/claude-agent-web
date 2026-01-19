import { ChatLayout } from '@/components/chat/ChatLayout';
import { ChatProvider } from '@/contexts/ChatContext';

const Index = () => {
  return (
    <ChatProvider>
      <div className="w-full h-full">
        <ChatLayout />
      </div>
    </ChatProvider>
  );
};

export default Index;