import { useState } from 'react';
import styled from 'styled-components';
import type { CockpitEvent } from '../../api/cockpit-types';

const Container = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.large};
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 200px;
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.shade};
`;

const Title = styled.h3`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`;

const FilterSelect = styled.select`
  padding: 0.25rem 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.shade};
  border-radius: ${({ theme }) => theme.borderRadius.small};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.75rem;
`;

const EventList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
`;

const EventItem = styled.div<{ $success: boolean; $expanded: boolean }>`
  background: ${({ theme }) => theme.colors.background};
  border-left: 3px solid ${({ theme, $success }) =>
    $success ? theme.colors.success : theme.colors.error};
  border-radius: ${({ theme }) => theme.borderRadius.medium};
  margin-bottom: 0.375rem;
  overflow: hidden;
`;

const EventHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.shade};
  }
`;

const EventIcon = styled.span`
  font-size: 0.625rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

const EventName = styled.span`
  flex: 1;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text};
`;

const EventTime = styled.span`
  font-size: 0.6875rem;
  color: ${({ theme }) => theme.colors.textAlt};
  font-family: 'JetBrains Mono', monospace;
`;

const EventStatus = styled.span<{ $success: boolean }>`
  font-size: 0.75rem;
  color: ${({ theme, $success }) =>
    $success ? theme.colors.success : theme.colors.error};
`;

const EventSummary = styled.div`
  padding: 0 0.5rem 0.5rem;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textAlt};
`;

const EventLogs = styled.div`
  padding: 0.5rem;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  font-size: 0.6875rem;
  font-family: 'JetBrains Mono', monospace;
  color: ${({ theme }) => theme.colors.textAlt};
  white-space: pre-wrap;
  border-top: 1px solid ${({ theme }) => theme.colors.shade};
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${({ theme }) => theme.colors.textAlt};
  font-size: 0.8125rem;
`;

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString();
}

function getEventSummary(event: CockpitEvent): string {
  const meta = event.meta || {};
  if (event.eventName === 'command-executed' && meta.command) {
    return meta.command.name || 'command';
  }
  if (event.eventName === 'hook-executed' && meta.hook) {
    return meta.hook.name || 'hook';
  }
  if (event.eventName === 'cronjob-executed' && meta.cronjob) {
    return meta.cronjob.name || 'cronjob';
  }
  if (event.eventName === 'chat-message' && meta.msg) {
    return meta.msg.substring(0, 50);
  }
  return '';
}

function formatLogs(meta: CockpitEvent['meta']): string {
  if (!meta?.result?.logs?.length) {
    return 'No logs';
  }
  return meta.result.logs
    .map((log) => {
      const details = log.details
        ? '\n  ' + (typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2))
        : '';
      return log.msg + details;
    })
    .join('\n');
}

interface EventStreamProps {
  events: CockpitEvent[];
  isServerRunning: boolean;
}

export function EventStream({ events, isServerRunning }: EventStreamProps) {
  const [filter, setFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const filteredEvents = filter === 'all'
    ? events
    : events.filter((e) => e.eventName === filter);

  const toggleExpand = (index: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <Container>
      <Header>
        <Title>Live Events</Title>
        <FilterSelect value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Events</option>
          <option value="command-executed">Commands</option>
          <option value="hook-executed">Hooks</option>
          <option value="cronjob-executed">Cron Jobs</option>
          <option value="chat-message">Chat</option>
        </FilterSelect>
      </Header>

      <EventList>
        {!isServerRunning ? (
          <EmptyState>Start the mock server to see live events</EmptyState>
        ) : filteredEvents.length === 0 ? (
          <EmptyState>Waiting for events...</EmptyState>
        ) : (
          filteredEvents.map((event, index) => {
            const success = event.meta?.result?.success !== false;
            const isExpanded = expandedIds.has(index);
            const summary = getEventSummary(event);

            return (
              <EventItem key={index} $success={success} $expanded={isExpanded}>
                <EventHeader onClick={() => toggleExpand(index)}>
                  <EventIcon>{isExpanded ? '▼' : '▶'}</EventIcon>
                  <EventName>{event.eventName}</EventName>
                  <EventTime>{formatTime(event.createdAt)}</EventTime>
                  <EventStatus $success={success}>{success ? '✓' : '✗'}</EventStatus>
                </EventHeader>
                {summary && <EventSummary>{summary}</EventSummary>}
                {isExpanded && <EventLogs>{formatLogs(event.meta)}</EventLogs>}
              </EventItem>
            );
          })
        )}
      </EventList>
    </Container>
  );
}
