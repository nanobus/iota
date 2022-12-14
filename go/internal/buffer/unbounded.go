/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// Package buffer provides an implementation of an unbounded buffer.
package buffer

import (
	"sync"
)

// Unbounded is an implementation of an unbounded buffer which does not use
// extra goroutines. This is typically used for passing updates from one entity
// to another within gRPC.
//
// All methods on this type are thread-safe and don't block on anything except
// the underlying mutex used for synchronization.
//
// Unbounded supports values of any type to be stored in it by using a channel
// of `T`. This means that a call to Put() incurs an extra memory
// allocation, and also that users need a type assertion while reading. For
// performance critical code paths, using Unbounded is strongly discouraged and
// defining a new type specific implementation of this buffer is preferred. See
// internal/transport/transport.go for an example of this.
type Unbounded[T any] struct {
	c        chan T
	mu       sync.Mutex
	backlog  []T
	disposed bool
}

// NewUnbounded returns a new instance of Unbounded.
func NewUnbounded[T any]() *Unbounded[T] {
	return &Unbounded[T]{c: make(chan T, 1)}
}

// Put adds t to the unbounded buffer.
func (b *Unbounded[T]) Put(t T) (ok bool) {
	b.mu.Lock()

	if b.disposed {
		b.mu.Unlock()
		return
	}

	ok = true

	if len(b.backlog) == 0 {
		select {
		case b.c <- t:
			b.mu.Unlock()
			return
		default:
		}
	}
	b.backlog = append(b.backlog, t)
	b.mu.Unlock()
	return
}

// Load sends the earliest buffered data, if any, onto the read channel
// returned by Get(). Users are expected to call this every time they read a
// value from the read channel.
func (b *Unbounded[T]) Load() (n int) {
	b.mu.Lock()
	if len(b.backlog) > 0 {
		select {
		case b.c <- b.backlog[0]:
			var t T
			b.backlog[0] = t
			b.backlog = b.backlog[1:]
			n = 1
		default:
		}
	} else if b.disposed {
		b.close()
		n = -1
	}
	b.mu.Unlock()
	return
}

// Get returns a read channel on which values added to the buffer, via Put(),
// are sent on.
//
// Upon reading a value from this channel, users are expected to call Load() to
// send the next buffered value onto the channel if there is any.
func (b *Unbounded[T]) Get() <-chan T {
	return b.c
}

// Dispose mark current Unbounded as disposed.
func (b *Unbounded[T]) Dispose() {
	b.mu.Lock()
	b.disposed = true
	if len(b.backlog) == 0 {
		b.close()
	}
	b.mu.Unlock()
}

func (b *Unbounded[T]) close() (ok bool) {
	defer func() {
		ok = recover() == nil
	}()
	close(b.c)
	return
}
