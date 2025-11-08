import { useState, useEffect } from 'react';

const InlineDateRangePicker = ({ 
  startDate, 
  endDate, 
  onChange, 
  minDate,
  blockedDates = [],
  existingBookings = [],
  singleDateMode = false
}) => {
  const [tempStartDate, setTempStartDate] = useState(startDate || '');
  const [tempEndDate, setTempEndDate] = useState(endDate || '');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);

  useEffect(() => {
    setTempStartDate(startDate || '');
    setTempEndDate(endDate || '');
    setSelectingStart(!startDate);
  }, [startDate, endDate]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
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

  // Check if a date is blocked
  const isDateBlocked = (date) => {
    return blockedDates.includes(date);
  };

  // Check if a date is booked (part of an existing booking)
  const isDateBooked = (date) => {
    const checkDate = new Date(date + 'T00:00:00');
    checkDate.setHours(0, 0, 0, 0);
    
    return existingBookings.some(booking => {
      if (!booking.checkIn || !booking.checkOut) return false;
      
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      // Check if date is within booking range (excluding checkout date as it's available)
      return checkDate >= checkIn && checkDate < checkOut;
    });
  };

  const isDateDisabled = (date) => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (minDate) {
      // Compare date strings directly
      if (date < minDate) return true;
    } else if (date < todayString) {
      return true;
    }
    
    // Check if date is blocked or booked
    return isDateBlocked(date) || isDateBooked(date);
  };

  const handleDateClick = (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    // Create date string directly to avoid timezone issues
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (isDateDisabled(dateString)) return;

    // Single date mode for experiences/services
    if (singleDateMode) {
      setTempStartDate(dateString);
      setTempEndDate('');
      onChange(dateString, '');
      return;
    }

    let newStart = tempStartDate;
    let newEnd = tempEndDate;

    if (selectingStart || !tempStartDate) {
      // Selecting start date
      newStart = dateString;
      newEnd = '';
      setTempStartDate(dateString);
      setTempEndDate('');
      setSelectingStart(false);
    } else {
      // Selecting end date
      // Compare date strings directly (YYYY-MM-DD format is lexicographically sortable)
      if (dateString < tempStartDate) {
        // If end is before start, swap them
        newStart = dateString;
        newEnd = tempStartDate;
        setTempStartDate(dateString);
        setTempEndDate(tempStartDate);
      } else {
        newStart = tempStartDate;
        newEnd = dateString;
        setTempEndDate(dateString);
      }
      setSelectingStart(true);
    }

    // Call onChange immediately
    onChange(newStart, newEnd);
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
    <div className="w-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          type="button"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h4 className="text-sm font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h4>
        <button
          onClick={() => navigateMonth(1)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          type="button"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
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
          const isBlocked = isDateBlocked(dateString);
          const isBooked = isDateBooked(dateString);

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={disabled}
              type="button"
              title={
                disabled 
                  ? isBlocked 
                    ? 'Blocked by host' 
                    : isBooked 
                      ? 'Already booked' 
                      : 'Past date'
                  : ''
              }
              className={`
                aspect-square rounded-md text-xs font-medium transition-all relative
                ${disabled 
                  ? isBlocked
                    ? 'bg-red-100 text-red-400 cursor-not-allowed border border-red-300'
                    : isBooked
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                      : 'text-gray-300 cursor-not-allowed'
                  : isStart || isEnd
                    ? 'bg-orange-500 text-white font-semibold hover:bg-orange-600'
                    : inRange
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {day}
              {isBlocked && (
                <span className="absolute bottom-0.5 right-0.5 text-[8px] text-red-600 font-bold">✕</span>
              )}
              {isBooked && !isBlocked && (
                <span className="absolute bottom-0.5 right-0.5 text-[8px] text-gray-500">●</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Date Summary */}
      {tempStartDate && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          {tempStartDate && tempEndDate ? (
            <p className="text-xs font-medium text-gray-900">
              {formatDate(tempStartDate)} → {formatDate(tempEndDate)}
            </p>
          ) : (
            <p className="text-xs font-medium text-gray-900">
              {formatDate(tempStartDate)} → Select checkout
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineDateRangePicker;

