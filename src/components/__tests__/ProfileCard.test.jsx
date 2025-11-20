import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfileCard from '../ProfileCard'
import { vi } from 'vitest'

test('renders profile card with name and follow button', () => {
  const profile = { id: 'u1', display_name: 'Alice', email: 'alice@example.com', followers_count: 3, bio: 'Hello' }
  const onFollowToggle = vi.fn()
  const onView = vi.fn()

  render(<ProfileCard profile={profile} isFollowing={false} onFollowToggle={onFollowToggle} onView={onView} onPreview={() => {}} />)

  expect(screen.getByText('Alice')).toBeInTheDocument()
  const followBtn = screen.getByText('Follow')
  expect(followBtn).toBeInTheDocument()
  fireEvent.click(followBtn)
  expect(onFollowToggle).toHaveBeenCalledWith('u1', true)
})
