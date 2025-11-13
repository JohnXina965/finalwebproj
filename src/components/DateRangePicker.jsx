import { useState, useEffect, useRef } from 'react';

// Add pop-up animation styles
const popUpStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes popUp {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(-20px);
    }
    50% {
      transform: scale(1.05) translateY(0);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.2s ease-out;
  }
  
  .animate-pop-up {
    animation: popUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('date-range-picker-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'date-range-picker-styles';
  styleSheet.textContent = popUpStyles;
  document.head.appendChild(styleSheet);
}

const DateRangePicker = ({ 
  startDate, 
  endDate, 
  onChange, 
  minDate, 
  placeholder = "Select dates",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate || '');
  const [tempEndDate, setTempEndDate] = useState(endDate || '');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const modalRef = useRef(null);

  useEffect(() => {
    setTempStartDate(startDate || '');
    setTempEndDate(endDate || '');
    setSelectingStart(!startDate);
  }, [startDate, endDate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDisplayDate = () => {
    if (startDate && endDate) {
      return `${formatDate(startDate)} → ${formatDate(endDate)}`;
    } else if (startDate) {
      return formatDate(startDate);
    }
    return placeholder;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const isDateInRange = (date) => {
    if (!tempStartDate || !tempEndDate) return false;
    // Compare date strings directly (YYYY-MM-DD format is lexicographically sortable)
    return date >= tempStartDate && date <= tempEndDate;
  };

  const isStartDate = (date) => {
    if (!tempStartDate) return false;
    // Compare date strings directly to avoid timezone issues
    return date === tempStartDate;
  };

  const isEndDate = (date) => {
    if (!tempEndDate) return false;
    // Compare date strings directly to avoid timezone issues
    return date === tempEndDate;
  };

  const isDateDisabled = (date) => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (minDate) {
      // Compare date strings directly
      return date < minDate;
    }
    return date < todayString;
  };

  const handleDateClick = (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    // Create date string directly to avoid timezone issues
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (isDateDisabled(dateString)) return;

    if (selectingStart || !tempStartDate) {
      // Selecting start date
      setTempStartDate(dateString);
      setTempEndDate('');
      setSelectingStart(false);
    } else {
      // Selecting end date
      // Compare date strings directly (YYYY-MM-DD format is lexicographically sortable)
      if (dateString < tempStartDate) {
        // If end is before start, swap them
        setTempStartDate(dateString);
        setTempEndDate(tempStartDate);
      } else {
        setTempEndDate(dateString);
      }
      setSelectingStart(true);
    }
  };

  const handleApply = () => {
    onChange(tempStartDate, tempEndDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempStartDate('');
    setTempEndDate('');
    onChange('', '');
    setIsOpen(false);
  };

  const calculateNights = () => {
    if (tempStartDate && tempEndDate) {
      const start = new Date(tempStartDate);
      const end = new Date(tempEndDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Create array of days for the calendar
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full text-left px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={`text-sm font-medium ${startDate || endDate ? 'text-gray-900' : 'text-gray-500'}`}>
              {formatDisplayDate()}
            </span>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            ref={modalRef}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 animate-pop-up"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Select Dates</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Calendar */}
            <div className="mb-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h4 className="text-base font-semibold text-gray-900">
                  {monthNames[month]} {year}
                </h4>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1.5">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1.5">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="aspect-square"></div>;
                  }

                  const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const disabled = isDateDisabled(dateString);
                  const isStart = isStartDate(dateString);
                  const isEnd = isEndDate(dateString);
                  const inRange = isDateInRange(dateString) && !isStart && !isEnd;

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      disabled={disabled}
                      className={`
                        aspect-square rounded-md text-xs font-medium transition-all py-1
                        ${disabled 
                          ? 'text-gray-300 cursor-not-allowed' 
                          : isStart || isEnd
                            ? 'bg-orange-500 text-white font-semibold hover:bg-orange-600'
                            : inRange
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                              : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Summary */}
            {tempStartDate && (
              <div className="mb-3 p-2.5 bg-gray-50 rounded-lg">
                {tempStartDate && tempEndDate ? (
                  <p className="text-xs font-medium text-gray-900">
                    {formatDate(tempStartDate)} → {formatDate(tempEndDate)}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-gray-900">
                    {formatDate(tempStartDate)} → Select checkout
                  </p>
                )}
                {tempStartDate && tempEndDate && (
                  <p className="text-xs text-teal-600 font-medium mt-0.5">
                    {calculateNights()} {calculateNights() === 1 ? 'night' : 'nights'}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={handleClear}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleApply}
                disabled={!tempStartDate}
                className="flex-1 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DateRangePicker;
