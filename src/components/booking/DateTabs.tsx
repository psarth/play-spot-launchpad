import { format, addDays, isToday, isTomorrow } from "date-fns";

interface DateTabsProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date) => void;
}

export const DateTabs = ({ selectedDate, onDateSelect }: DateTabsProps) => {
  const today = new Date();
  const dates = [
    { date: today, label: "Today" },
    { date: addDays(today, 1), label: "Tomorrow" },
    { date: addDays(today, 2), label: format(addDays(today, 2), "EEE, d MMM") },
    { date: addDays(today, 3), label: format(addDays(today, 3), "EEE, d MMM") },
  ];

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {dates.map(({ date, label }) => (
        <button
          key={label}
          onClick={() => onDateSelect(date)}
          className={`
            flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            ${isSelected(date)
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground hover:bg-muted/80'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default DateTabs;
