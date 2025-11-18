// src/components/LikeButton.jsx
import { useLikes } from '../contexts/LikesContext'
import { useState, useEffect } from 'react'

export default function LikeButton({ itemType, itemId }) {
  const { isLiked, toggleLike, likeCount } = useLikes()
  const [count, setCount] = useState(0)
  const liked = isLiked(itemType, itemId)

  useEffect(() => {
    async function fetchCount() {
      const c = await likeCount(itemType, itemId)
      setCount(c)
    }
    fetchCount()
  }, [liked, itemType, itemId, likeCount])

  const handleClick = async (e) => {
    e.stopPropagation()
    await toggleLike(itemType, itemId)
    const c = await likeCount(itemType, itemId)
    setCount(c)
  }

  return (
    <button className={`like-btn${liked ? ' liked' : ''}`} onClick={handleClick} title={liked ? 'Unlike' : 'Like'}>
      {liked ? '👍' : '👍'} <span className="like-count">{count}</span>
    </button>
  )
}
