interface ContactItemProps {
  icon: string;
  text: string;
}

export function ContactItem({ icon, text }: ContactItemProps) {
  return (
    <div className="flex flex-row gap-2 w-full items-start">
      <span className="text-xs flex-shrink-0 mt-0.5">{icon}</span>
      <p 
        className="text-xs w-full break-words"
        style={{ 
          width: '100%',
          wordBreak: 'break-word'
        }}
      >
        {text}
      </p>
    </div>
  );
}
