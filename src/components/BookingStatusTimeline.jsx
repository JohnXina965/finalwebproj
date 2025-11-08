import React from 'react';
import { getBookingStatusTimeline } from '../services/BookingReminderService';

/**
 * Booking Status Timeline Component
 * Displays a visual timeline of booking status changes
 */
const BookingStatusTimeline = ({ booking }) => {
  if (!booking) return null;

  const timeline = getBookingStatusTimeline(booking);
  const now = new Date();

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No status history available</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      
      <div className="space-y-6">
        {timeline.map((event, index) => {
          const isPast = event.date < now;
          const isToday = event.date.toDateString() === now.toDateString();
          const isUpcoming = !isPast && !isToday;
          
          return (
            <div key={index} className="relative flex items-start gap-4">
              {/* Timeline dot */}
              <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isPast 
                  ? 'bg-teal-500' 
                  : isToday 
                    ? 'bg-orange-500' 
                    : 'bg-gray-300'
              }`}>
                <span className="text-white text-sm">{event.icon}</span>
              </div>
              
              {/* Event content */}
              <div className={`flex-1 pb-6 ${index === timeline.length - 1 ? 'pb-0' : ''}`}>
                <div className={`bg-white rounded-lg border-2 p-4 ${
                  isPast 
                    ? 'border-teal-200' 
                    : isToday 
                      ? 'border-orange-200 bg-orange-50' 
                      : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className={`font-semibold ${
                        isPast 
                          ? 'text-teal-900' 
                          : isToday 
                            ? 'text-orange-900' 
                            : 'text-gray-700'
                      }`}>
                        {event.label}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {event.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500">
                        {event.date.toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {event.date.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status badge */}
                  {isToday && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Today
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Upcoming
                    </span>
                  )}
                  {isPast && !isToday && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BookingStatusTimeline;

