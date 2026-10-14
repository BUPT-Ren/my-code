from . import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    
    # 使用数据库中的字段名
    user_id = db.Column(db.Integer, primary_key=True, name='user_id')
    phone = db.Column(db.String(15), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    birthday = db.Column(db.Date)
    hobbies = db.Column(db.JSON)  # 使用 JSON 类型
    school = db.Column(db.String(100))
    avatar_url = db.Column(db.String(255))
    status = db.Column(db.Enum('active', 'suspended', 'deleted'), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "user_id": self.user_id,
            "phone": self.phone,
            "birthday": self.birthday.isoformat() if self.birthday else None,
            "hobbies": self.hobbies,
            "school": self.school,
            "avatar_url": self.avatar_url,
            "status": self.status
        }


class Book(db.Model):
    __tablename__ = 'books'
    
    book_id = db.Column(db.Integer, primary_key=True, name='book_id')
    isbn = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(100))
    genres = db.Column(db.JSON)
    introduction = db.Column(db.Text)
    publish_date = db.Column(db.Date)
    total_copies = db.Column(db.Integer, default=1)
    available_copies = db.Column(db.Integer, default=1)
    cover_url = db.Column(db.String(255))
    douban_link = db.Column(db.String(255))
    video_link = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            "book_id": self.book_id,
            "isbn": self.isbn,
            "title": self.title,
            "author": self.author,
            "genres": self.genres,
            "introduction": self.introduction,
            "publish_date": self.publish_date.isoformat() if self.publish_date else None,
            "total_copies": self.total_copies,
            "available_copies": self.available_copies,
            "cover_url": self.cover_url,
            "available": self.available_copies > 0  # 兼容原API
        }


class BorrowRecord(db.Model):
    __tablename__ = 'borrow_records'
    
    record_id = db.Column(db.Integer, primary_key=True, name='record_id')
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id'))
    borrow_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    due_time = db.Column(db.DateTime, nullable=False)
    return_time = db.Column(db.DateTime)
    renewal_count = db.Column(db.Integer, default=0)
    status = db.Column(db.Enum('borrowed', 'returned', 'overdue', 'lost'), default='borrowed')
    review = db.Column(db.Text)
    # 关系
    user = db.relationship('User', backref='borrow_records')
    book = db.relationship('Book', backref='borrow_records')
    
    def to_dict(self):
        return {
            "record_id": self.record_id,
            "user_id": self.user_id,
            "book_id": self.book_id,
            "borrow_time": self.borrow_time.isoformat() if self.borrow_time else None,
            "due_time": self.due_time.isoformat() if self.due_time else None,
            "return_time": self.return_time.isoformat() if self.return_time else None,
            "renewal_count": self.renewal_count,
            "status": self.status,
            "review": self.review, 
            "book_title": self.book.title if self.book else None
        }


class Favorite(db.Model):
    __tablename__ = 'favorites'
    
    favorite_id = db.Column(db.Integer, primary_key=True, name='favorite_id')
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    user = db.relationship('User', backref='favorites')
    book = db.relationship('Book', backref='favorited_by')
    
    def to_dict(self):
        return {
            "favorite_id": self.favorite_id,
            "user_id": self.user_id,
            "book_id": self.book_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Notification(db.Model):
    __tablename__ = 'notifications'
    
    notification_id = db.Column(db.Integer, primary_key=True, name='notification_id')
    sender_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    title = db.Column(db.String(100))
    content = db.Column(db.Text)
    type = db.Column(db.Enum('system', 'due_reminder', 'reservation', 'news', 'activity'), default='system')
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_notifications')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_notifications')
    
    def to_dict(self):
        return {
            "notification_id": self.notification_id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "title": self.title,
            "content": self.content,
            "type": self.type,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# 添加其他表（如果使用）
class Admin(db.Model):
    __tablename__ = 'admins'
    
    admin_id = db.Column(db.Integer, primary_key=True, name='admin_id')
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), unique=True)
    level = db.Column(db.Enum('super', 'normal'), default='normal')
    permissions = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='admin_info')


class AIRecommendation(db.Model):
    __tablename__ = 'ai_recommendations'
    
    recommendation_id = db.Column(db.Integer, primary_key=True, name='recommendation_id')
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id'))
    recommended_at = db.Column(db.DateTime, default=datetime.utcnow)
    feedback = db.Column(db.Enum('like', 'dislike', 'none'), default='none')
    feedback_at = db.Column(db.DateTime)
    
    user = db.relationship('User', backref='recommendations')
    book = db.relationship('Book', backref='recommended_to')


class BorrowRequest(db.Model):
    __tablename__ = 'borrow_requests'
    
    request_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id'), nullable=False)
    request_type = db.Column(db.Enum('borrow', 'return', 'renew', 'lost'), nullable=False)
    record_id = db.Column(db.Integer, db.ForeignKey('borrow_records.record_id'), nullable=True)
    status = db.Column(db.Enum('pending', 'approved', 'picked_up', 'rejected'), default='pending')
    request_time = db.Column(db.DateTime, default=datetime.utcnow)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    reject_reason = db.Column(db.String(255), nullable=True)
    pickup_time = db.Column(db.DateTime, nullable=True)
    admin_message = db.Column(db.Text, nullable=True)
    
    user = db.relationship('User', foreign_keys=[user_id], backref='borrow_requests')
    book = db.relationship('Book', backref='borrow_requests')
    approver = db.relationship('User', foreign_keys=[approved_by])
    borrow_record = db.relationship('BorrowRecord', backref='return_request')
    
    def to_dict(self):
        return {
            "request_id": self.request_id,
            "user_id": self.user_id,
            "book_id": self.book_id,
            "request_type": self.request_type,
            "record_id": self.record_id,
            "status": self.status,
            "request_time": self.request_time.isoformat() if self.request_time else None,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "reject_reason": self.reject_reason,
            "pickup_time": self.pickup_time.isoformat() if self.pickup_time else None,
            "admin_message": self.admin_message,
            "book_title": self.book.title if self.book else None,
            "book_cover": self.book.cover_url if self.book else None,
            "book_author": self.book.author if self.book else None
        }


class Reservation(db.Model):
    __tablename__ = 'reservations'
    
    reservation_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id'))
    reserved_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.Enum('waiting', 'ready', 'cancelled', 'expired'), default='waiting')
    expiry_date = db.Column(db.DateTime)
    notified = db.Column(db.Boolean, default=False)
    
    user = db.relationship('User', backref='reservations')
    book = db.relationship('Book', backref='reservations')
    
    def to_dict(self):
        return {
            "reservation_id": self.reservation_id,
            "user_id": self.user_id,
            "book_id": self.book_id,
            "reserved_at": self.reserved_at.isoformat() if self.reserved_at else None,
            "status": self.status,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "notified": self.notified
        }


class PasswordResetRequest(db.Model):
    __tablename__ = 'password_reset_requests'
    
    request_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    phone = db.Column(db.String(15))
    reason = db.Column(db.Text)
    status = db.Column(db.Enum('pending', 'approved', 'rejected'), default='pending')
    reject_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    processed_at = db.Column(db.DateTime)
    processed_by = db.Column(db.Integer, db.ForeignKey('admins.admin_id'))
    
    user = db.relationship('User', backref='password_reset_requests')
    processor = db.relationship('Admin', backref='processed_reset_requests')
    
    def to_dict(self):
        return {
            "request_id": self.request_id,
            "user_id": self.user_id,
            "phone": self.phone,
            "reason": self.reason,
            "status": self.status,
            "reject_reason": self.reject_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "user_phone": self.user.phone if self.user else None,
            "user_school": self.user.school if self.user else None
        }


class BrowseHistory(db.Model):
    __tablename__ = 'browse_history'
    
    history_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id'))
    browse_time = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='browse_history')
    book = db.relationship('Book', backref='browse_history')
    
    def to_dict(self):
        return {
            "history_id": self.history_id,
            "user_id": self.user_id,
            "book_id": self.book_id,
            "browse_time": self.browse_time.isoformat() if self.browse_time else None
        }


class AIChatHistory(db.Model):
    __tablename__ = 'ai_chat_history'
    
    chat_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    role = db.Column(db.Enum('user', 'assistant'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='chat_history')
    
    def to_dict(self):
        return {
            "chat_id": self.chat_id,
            "user_id": self.user_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Activity(db.Model):
    __tablename__ = 'activities'
    
    activity_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    cover_image = db.Column(db.String(500))
    content_images = db.Column(db.JSON)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    registration_start_time = db.Column(db.DateTime)
    registration_end_time = db.Column(db.DateTime)
    location = db.Column(db.String(200))
    max_participants = db.Column(db.Integer, default=0)
    status = db.Column(db.Enum('draft', 'published', 'ongoing', 'ended'), default='draft')
    created_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    creator = db.relationship('User', backref='created_activities')
    
    def to_dict(self):
        return {
            "activity_id": self.activity_id,
            "title": self.title,
            "description": self.description,
            "cover_image": self.cover_image,
            "content_images": self.content_images,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "registration_start_time": self.registration_start_time.isoformat() if self.registration_start_time else None,
            "registration_end_time": self.registration_end_time.isoformat() if self.registration_end_time else None,
            "location": self.location,
            "max_participants": self.max_participants,
            "status": self.status,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "participant_count": len(self.registrations) if hasattr(self, 'registrations') else 0
        }


class ActivitySummary(db.Model):
    __tablename__ = 'activity_summaries'
    
    summary_id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.activity_id'), unique=True)
    content = db.Column(db.Text, nullable=False)
    images = db.Column(db.JSON)
    likes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    activity = db.relationship('Activity', backref=db.backref('summary', uselist=False))
    
    def to_dict(self):
        return {
            "summary_id": self.summary_id,
            "activity_id": self.activity_id,
            "content": self.content,
            "images": self.images,
            "likes_count": self.likes_count,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ActivityRegistration(db.Model):
    __tablename__ = 'activity_registrations'
    
    registration_id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.activity_id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    status = db.Column(db.Enum('pending', 'approved', 'rejected', 'cancelled'), default='pending')
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    check_in_time = db.Column(db.DateTime)
    check_in_status = db.Column(db.Enum('not_checked_in', 'checked_in'), default='not_checked_in')
    check_in_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    
    activity = db.relationship('Activity', backref='registrations')
    user = db.relationship('User', foreign_keys=[user_id], backref='activity_registrations')
    approver = db.relationship('User', foreign_keys=[approved_by])
    check_in_user = db.relationship('User', foreign_keys=[check_in_by])
    
    def to_dict(self):
        return {
            "registration_id": self.registration_id,
            "activity_id": self.activity_id,
            "user_id": self.user_id,
            "status": self.status,
            "registered_at": self.registered_at.isoformat() if self.registered_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "check_in_time": self.check_in_time.isoformat() if self.check_in_time else None,
            "check_in_status": self.check_in_status,
            "user_name": self.user.phone if self.user else None,
            "user_avatar": self.user.avatar_url if self.user else None,
            "user_school": self.user.school if self.user else None
        }


class ActivityPost(db.Model):
    __tablename__ = 'activity_posts'
    
    post_id = db.Column(db.Integer, primary_key=True)
    activity_id = db.Column(db.Integer, db.ForeignKey('activities.activity_id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    content = db.Column(db.Text, nullable=False)
    images = db.Column(db.JSON)
    likes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    activity = db.relationship('Activity', backref='posts')
    user = db.relationship('User', backref='activity_posts')
    
    def to_dict(self):
        return {
            "post_id": self.post_id,
            "activity_id": self.activity_id,
            "user_id": self.user_id,
            "content": self.content,
            "images": self.images,
            "likes_count": self.likes_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_name": self.user.phone if self.user else None,
            "user_avatar": self.user.avatar_url if self.user else None,
            "is_liked": False
        }


class ActivityComment(db.Model):
    __tablename__ = 'activity_comments'
    
    comment_id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('activity_posts.post_id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    post = db.relationship('ActivityPost', backref='comments')
    user = db.relationship('User', backref='activity_comments')
    
    def to_dict(self):
        return {
            "comment_id": self.comment_id,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "content": self.content,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_name": self.user.phone if self.user else None,
            "user_avatar": self.user.avatar_url if self.user else None
        }


class ActivityLike(db.Model):
    __tablename__ = 'activity_likes'
    
    like_id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('activity_posts.post_id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    post = db.relationship('ActivityPost', backref='likes')
    user = db.relationship('User', backref='activity_likes')
    
    __table_args__ = (db.UniqueConstraint('post_id', 'user_id', name='unique_activity_like'),)
    
    def to_dict(self):
        return {
            "like_id": self.like_id,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class ActivitySummaryLike(db.Model):
    __tablename__ = 'activity_summary_likes'
    
    like_id = db.Column(db.Integer, primary_key=True)
    summary_id = db.Column(db.Integer, db.ForeignKey('activity_summaries.summary_id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    summary = db.relationship('ActivitySummary', backref='likes')
    user = db.relationship('User', backref='summary_likes')
    
    __table_args__ = (db.UniqueConstraint('summary_id', 'user_id', name='unique_summary_like'),)
    
    def to_dict(self):
        return {
            "like_id": self.like_id,
            "summary_id": self.summary_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class BookReview(db.Model):
    __tablename__ = 'book_reviews'
    
    review_id = db.Column(db.Integer, primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.book_id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    content = db.Column(db.Text, nullable=False)
    rating = db.Column(db.Integer, default=5)
    status = db.Column(db.Enum('pending', 'approved', 'rejected'), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    
    book = db.relationship('Book', backref='reviews')
    user = db.relationship('User', foreign_keys=[user_id], backref='book_reviews')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])
    
    def to_dict(self):
        return {
            "review_id": self.review_id,
            "book_id": self.book_id,
            "user_id": self.user_id,
            "content": self.content,
            "rating": self.rating,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "user_name": self.user.phone if self.user else None,
            "user_avatar": self.user.avatar_url if self.user else None,
            "book_title": self.book.title if self.book else None
        }