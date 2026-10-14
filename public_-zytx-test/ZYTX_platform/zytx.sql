/*
Navicat MySQL Data Transfer

Source Server         : test_zytx
Source Server Version : 80041
Source Host           : localhost:3306
Source Database       : zytx

Target Server Type    : MYSQL
Target Server Version : 80041
File Encoding         : 65001

Date: 2026-03-22 02:07:21
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for activities
-- ----------------------------
DROP TABLE IF EXISTS `activities`;
CREATE TABLE `activities` (
`activity_id`  int NOT NULL AUTO_INCREMENT ,
`title`  varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`description`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL ,
`cover_image`  varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`content_images`  json NULL DEFAULT NULL ,
`start_time`  datetime NOT NULL ,
`end_time`  datetime NOT NULL ,
`registration_start_time`  datetime NULL DEFAULT NULL COMMENT '报名开始时间' ,
`registration_end_time`  datetime NULL DEFAULT NULL COMMENT '报名结束时间' ,
`location`  varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`max_participants`  int NULL DEFAULT NULL ,
`status`  enum('draft','published','ongoing','ended') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`created_by`  int NULL DEFAULT NULL ,
`created_at`  datetime NULL DEFAULT NULL ,
`updated_at`  datetime NULL DEFAULT NULL ,
PRIMARY KEY (`activity_id`),
FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `created_by` (`created_by`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=3

;

-- ----------------------------
-- Records of activities
-- ----------------------------
BEGIN;
INSERT INTO `activities` (`activity_id`, `title`, `description`, `cover_image`, `content_images`, `start_time`, `end_time`, `registration_start_time`, `registration_end_time`, `location`, `max_participants`, `status`, `created_by`, `created_at`) VALUES ('1', '北京邮电大学参观', '参观北京邮电大学', '/static/uploads/20260318175418_OIP-C.webp', '[]', '2026-03-18 17:54:00', '2026-03-23 17:54:00', '2026-03-24 01:51:00', '2026-03-25 01:51:00', '北京邮电大学', '30', 'published', '32', '2026-03-18 09:54:36'), ('2', '1234567', '123rfdsdsg', '/static/uploads/20260318195233_OIP-C.webp', '[]', '2026-03-14 19:52:00', '2026-03-16 19:52:00', '2026-03-21 01:51:00', '2026-03-23 01:51:00', '北京邮电大学', '30', 'published', '32', '2026-03-18 11:52:36');
COMMIT;

-- ----------------------------
-- Table structure for activity_comments
-- ----------------------------
DROP TABLE IF EXISTS `activity_comments`;
CREATE TABLE `activity_comments` (
`comment_id`  int NOT NULL AUTO_INCREMENT ,
`post_id`  int NULL DEFAULT NULL ,
`user_id`  int NULL DEFAULT NULL ,
`content`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`created_at`  datetime NULL DEFAULT NULL ,
PRIMARY KEY (`comment_id`),
FOREIGN KEY (`post_id`) REFERENCES `activity_posts` (`post_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `post_id` (`post_id`) USING BTREE ,
INDEX `user_id` (`user_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=1

;

-- ----------------------------
-- Records of activity_comments
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for activity_likes
-- ----------------------------
DROP TABLE IF EXISTS `activity_likes`;
CREATE TABLE `activity_likes` (
`like_id`  int NOT NULL AUTO_INCREMENT ,
`post_id`  int NULL DEFAULT NULL ,
`user_id`  int NULL DEFAULT NULL ,
`created_at`  datetime NULL DEFAULT NULL ,
PRIMARY KEY (`like_id`),
FOREIGN KEY (`post_id`) REFERENCES `activity_posts` (`post_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
UNIQUE INDEX `unique_activity_like` (`post_id`, `user_id`) USING BTREE ,
INDEX `user_id` (`user_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=1

;

-- ----------------------------
-- Records of activity_likes
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for activity_posts
-- ----------------------------
DROP TABLE IF EXISTS `activity_posts`;
CREATE TABLE `activity_posts` (
`post_id`  int NOT NULL AUTO_INCREMENT ,
`activity_id`  int NULL DEFAULT NULL ,
`user_id`  int NULL DEFAULT NULL ,
`content`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`images`  json NULL DEFAULT NULL ,
`likes_count`  int NULL DEFAULT NULL ,
`created_at`  datetime NULL DEFAULT NULL ,
PRIMARY KEY (`post_id`),
FOREIGN KEY (`activity_id`) REFERENCES `activities` (`activity_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `activity_id` (`activity_id`) USING BTREE ,
INDEX `user_id` (`user_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=1

;

-- ----------------------------
-- Records of activity_posts
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for activity_registrations
-- ----------------------------
DROP TABLE IF EXISTS `activity_registrations`;
CREATE TABLE `activity_registrations` (
`registration_id`  int NOT NULL AUTO_INCREMENT ,
`activity_id`  int NULL DEFAULT NULL ,
`user_id`  int NULL DEFAULT NULL ,
`status`  enum('pending','approved','rejected','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`registered_at`  datetime NULL DEFAULT NULL ,
`approved_at`  datetime NULL DEFAULT NULL ,
`approved_by`  int NULL DEFAULT NULL ,
PRIMARY KEY (`registration_id`),
FOREIGN KEY (`activity_id`) REFERENCES `activities` (`activity_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `activity_id` (`activity_id`) USING BTREE ,
INDEX `user_id` (`user_id`) USING BTREE ,
INDEX `approved_by` (`approved_by`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=3

;

-- ----------------------------
-- Records of activity_registrations
-- ----------------------------
BEGIN;
INSERT INTO `activity_registrations` (`registration_id`, `activity_id`, `user_id`, `status`, `registered_at`, `approved_at`, `approved_by`) VALUES ('1', '1', '31', 'rejected', '2026-03-21 17:30:39', null, null), ('2', '2', '31', 'approved', '2026-03-21 17:14:14', '2026-03-21 17:41:06', '32'), ('3', '2', '32', 'pending', '2026-03-21 17:52:13', '2026-03-21 17:41:05', '32'), ('4', '1', '32', 'rejected', '2026-03-21 17:34:18', null, null);
COMMIT;

-- ----------------------------
-- Table structure for activity_summaries
-- ----------------------------
DROP TABLE IF EXISTS `activity_summaries`;
CREATE TABLE `activity_summaries` (
`summary_id`  int NOT NULL AUTO_INCREMENT ,
`activity_id`  int NULL DEFAULT NULL ,
`content`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`images`  json NULL DEFAULT NULL ,
`created_at`  datetime NULL DEFAULT NULL ,
`likes_count`  int NULL DEFAULT 0 ,
PRIMARY KEY (`summary_id`),
FOREIGN KEY (`activity_id`) REFERENCES `activities` (`activity_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
UNIQUE INDEX `activity_id` (`activity_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=1

;

-- ----------------------------
-- Records of activity_summaries
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for activity_summary_likes
-- ----------------------------
DROP TABLE IF EXISTS `activity_summary_likes`;
CREATE TABLE `activity_summary_likes` (
`like_id`  int NOT NULL AUTO_INCREMENT ,
`summary_id`  int NULL DEFAULT NULL ,
`user_id`  int NULL DEFAULT NULL ,
`created_at`  datetime NULL DEFAULT CURRENT_TIMESTAMP ,
PRIMARY KEY (`like_id`),
FOREIGN KEY (`summary_id`) REFERENCES `activity_summaries` (`summary_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
UNIQUE INDEX `unique_summary_like` (`summary_id`, `user_id`) USING BTREE ,
INDEX `user_id` (`user_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=1

;

-- ----------------------------
-- Records of activity_summary_likes
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for admins
-- ----------------------------
DROP TABLE IF EXISTS `admins`;
CREATE TABLE `admins` (
`admin_id`  int NOT NULL AUTO_INCREMENT ,
`user_id`  int NOT NULL ,
`level`  enum('super','normal') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'normal' ,
`permissions`  json NULL DEFAULT NULL ,
`created_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
PRIMARY KEY (`admin_id`),
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
UNIQUE INDEX `user_id` (`user_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=8

;

-- ----------------------------
-- Records of admins
-- ----------------------------
BEGIN;
INSERT INTO `admins` (`admin_id`, `user_id`, `level`, `permissions`) VALUES ('1', '1', 'super', '[\"user_manage\", \"book_manage\", \"borrow_manage\", \"system_config\"]'), ('2', '2', 'normal', '[\"book_manage\", \"borrow_manage\"]'), ('3', '3', 'normal', '[\"user_manage\", \"borrow_manage\"]'), ('4', '4', 'normal', '[\"book_manage\", \"system_config\"]'), ('5', '5', 'normal', '[\"borrow_manage\", \"user_manage\"]'), ('6', '32', 'normal', '{}'), ('7', '33', 'normal', null);
COMMIT;

-- ----------------------------
-- Table structure for ai_chat_history
-- ----------------------------
DROP TABLE IF EXISTS `ai_chat_history`;
CREATE TABLE `ai_chat_history` (
`chat_id`  int NOT NULL AUTO_INCREMENT ,
`user_id`  int NOT NULL ,
`role`  enum('user','assistant') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`content`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`created_at`  datetime NULL DEFAULT CURRENT_TIMESTAMP ,
PRIMARY KEY (`chat_id`),
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE RESTRICT,
INDEX `idx_user_created` (`user_id`, `created_at`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=14

;

-- ----------------------------
-- Records of ai_chat_history
-- ----------------------------
BEGIN;
INSERT INTO `ai_chat_history` (`chat_id`, `user_id`, `role`, `content`, `created_at`) VALUES ('5', '31', 'user', '有什么经典名著推荐吗？', '2026-03-18 06:06:58'), ('6', '31', 'assistant', '当然有！以下是一些广受好评的经典名著推荐，适合不同兴趣的读者：\n\n1. **《百年孤独》** - 加夫列尔·加西亚·马尔克斯  \n   一部魔幻现实主义的代表作，讲述了布恩迪亚家族七代人的传奇故事，充满奇幻与哲思。\n\n2. **《战争与和平》** - 列夫·托尔斯泰  \n   一部史诗级小说，描绘了拿破仑战争时期俄国社会的广阔画卷，探讨了历史、命运与人性。\n\n3. **《傲慢与偏见》** - 简·奥斯汀  \n   以幽默诙谐的笔调讲述了一段关于爱情与婚姻的经典故事，语言优美，人物鲜活。\n\n4. **《罪与罚》** - 陀思妥耶夫斯基  \n   探讨人性深处的挣扎与救赎，是一部心理描写极为深刻的文学巨著。\n\n5. **《红楼梦》** - 曹雪芹  \n   中国古典文学的巅峰之作，描写了贾府由盛转衰的过程，情感丰富，寓意深远。\n\n这些作品不仅具有文学价值，也能够引发深层次的思考。如果你有特定的偏好（如喜欢哪个时代、哪种风格），我可以为你做更精准的推荐哦！', '2026-03-18 06:07:03'), ('7', '31', 'user', '你是谁', '2026-03-18 06:07:12'), ('8', '31', 'assistant', '你好！我是“智阅同行”图书馆平台的图书推荐助手。我的职责是帮助你寻找适合的书籍，讨论书中的内容与作者风格，分享阅读心得，并根据你的阅读偏好提供个性化的推荐。\n\n我致力于为每一位热爱阅读的朋友提供专业、贴心的服务，让阅读变得更有趣、更高效。如果你有任何关于书籍的问题，或者想了解某类题材的作品，欢迎随时告诉我！', '2026-03-18 06:07:13'), ('9', '31', 'user', '为什么给我推荐三体', '2026-03-18 11:33:29'), ('10', '31', 'assistant', '你好！感谢你的提问。其实我并没有特别针对你推荐《三体》，但如果你已经读过或对这本书感兴趣，那确实是一个非常值得推荐的科幻经典。\n\n《三体》是刘慈欣创作的“地球往事”系列的第一部，它不仅是中国科幻文学的里程碑之作，也在国际上获得了广泛的认可和赞誉。这本书融合了硬核科学、哲学思考与宏大的叙事，讲述人类面对外星文明“三体人”的挑战时所经历的惊心动魄的故事。\n\n如果你喜欢科幻、哲学思考、宏大世界观，或者对宇宙、文明、人性等主题感兴趣，《三体》绝对是一部不容错过的佳作。\n\n如果你愿意告诉我你的阅读偏好，我可以为你推荐更多类似风格的书籍哦！', '2026-03-18 11:33:31'), ('11', '31', 'user', '有什么经典名著推荐吗？', '2026-03-18 11:50:02'), ('12', '31', 'assistant', '当然有！以下是一些被广泛认为具有文学价值和思想深度的经典名著，适合不同兴趣的读者：\n\n1. **《百年孤独》** - 加夫列尔·加西亚·马尔克斯  \n   魔幻现实主义的巅峰之作，讲述布恩迪亚家族七代人的兴衰史，充满诗意与哲思。\n\n2. **《战争与和平》** - 列夫·托尔斯泰  \n   一部史诗级小说，描绘拿破仑战争时期俄国社会的宏大画卷，探讨历史、命运与人性。\n\n3. **《傲慢与偏见》** - 简·奥斯汀  \n   以优雅幽默的笔调讲述爱情与婚姻的故事，人物形象鲜明，语言隽永。\n\n4. **《罪与罚》** - 陀思妥耶夫斯基  \n   探讨人性深处的挣扎与救赎，心理描写细腻深刻，是世界文学中的经典之作。\n\n5. **《红楼梦》** - 曹雪芹  \n   中国古典文学的巅峰，描绘封建大家族的兴衰，情感丰富，寓意深远。\n\n如果你对某一类题材（如历史、哲学、爱情、科幻等）更感兴趣，我可以根据你的喜好做更精准的推荐哦！', '2026-03-18 11:50:06'), ('13', '31', 'user', '你是谁', '2026-03-20 05:42:25');
COMMIT;

-- ----------------------------
-- Table structure for ai_recommendations
-- ----------------------------
DROP TABLE IF EXISTS `ai_recommendations`;
CREATE TABLE `ai_recommendations` (
`recommendation_id`  int NOT NULL AUTO_INCREMENT ,
`user_id`  int NOT NULL ,
`book_id`  int NOT NULL ,
`recommended_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
`feedback`  enum('like','dislike','none') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'none' ,
`feedback_at`  timestamp NULL DEFAULT NULL ,
PRIMARY KEY (`recommendation_id`),
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `user_id` (`user_id`) USING BTREE ,
INDEX `book_id` (`book_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=31

;

-- ----------------------------
-- Records of ai_recommendations
-- ----------------------------
BEGIN;
INSERT INTO `ai_recommendations` (`recommendation_id`, `user_id`, `book_id`, `recommended_at`, `feedback`, `feedback_at`) VALUES ('1', '1', '2', '2026-01-13 00:40:40', 'like', null), ('2', '1', '3', '2026-01-13 00:40:40', 'none', null), ('3', '1', '4', '2026-01-13 00:40:40', 'dislike', null), ('4', '2', '1', '2026-01-13 00:40:40', 'like', null), ('5', '2', '5', '2026-01-13 00:40:40', 'none', null), ('6', '2', '6', '2026-01-13 00:40:40', 'like', null), ('7', '3', '7', '2026-01-13 00:40:40', 'none', null), ('8', '3', '8', '2026-01-13 00:40:40', 'like', null), ('9', '3', '9', '2026-01-13 00:40:40', 'dislike', null), ('10', '4', '10', '2026-01-13 00:40:40', 'like', null), ('11', '4', '11', '2026-01-13 00:40:40', 'none', null), ('12', '4', '12', '2026-01-13 00:40:40', 'like', null), ('13', '5', '13', '2026-01-13 00:40:40', 'dislike', null), ('14', '5', '14', '2026-01-13 00:40:40', 'none', null), ('15', '5', '15', '2026-01-13 00:40:40', 'like', null), ('16', '6', '16', '2026-01-13 00:40:40', 'like', null), ('17', '6', '17', '2026-01-13 00:40:40', 'none', null), ('18', '6', '18', '2026-01-13 00:40:40', 'dislike', null), ('19', '7', '19', '2026-01-13 00:40:40', 'none', null), ('20', '7', '20', '2026-01-13 00:40:40', 'like', null), ('21', '7', '21', '2026-01-13 00:40:40', 'like', null), ('22', '8', '22', '2026-01-13 00:40:40', 'dislike', null), ('23', '8', '23', '2026-01-13 00:40:40', 'none', null), ('24', '8', '24', '2026-01-13 00:40:40', 'like', null), ('25', '9', '25', '2026-01-13 00:40:40', 'like', null), ('26', '9', '26', '2026-01-13 00:40:40', 'none', null), ('27', '9', '27', '2026-01-13 00:40:40', 'dislike', null), ('28', '10', '28', '2026-01-13 00:40:40', 'none', null), ('29', '10', '29', '2026-01-13 00:40:40', 'like', null), ('30', '10', '30', '2026-01-13 00:40:40', 'like', null);
COMMIT;

-- ----------------------------
-- Table structure for book_reports
-- ----------------------------
DROP TABLE IF EXISTS `book_reports`;
CREATE TABLE `book_reports` (
`report_id`  int NOT NULL AUTO_INCREMENT ,
`record_id`  int NOT NULL ,
`user_id`  int NOT NULL ,
`type`  enum('lost','damaged','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'other' COMMENT '异常类型' ,
`reason`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '上报原因' ,
`status`  enum('pending','contacted','resolved') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'pending' ,
`admin_note`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT '管理员备注' ,
`created_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
`resolved_at`  timestamp NULL DEFAULT NULL ,
PRIMARY KEY (`report_id`),
FOREIGN KEY (`record_id`) REFERENCES `borrow_records` (`record_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `record_id` (`record_id`) USING BTREE ,
INDEX `user_id` (`user_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='异常上报表'
AUTO_INCREMENT=1

;

-- ----------------------------
-- Records of book_reports
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for book_reviews
-- ----------------------------
DROP TABLE IF EXISTS `book_reviews`;
CREATE TABLE `book_reviews` (
`review_id`  int NOT NULL AUTO_INCREMENT ,
`book_id`  int NULL DEFAULT NULL ,
`user_id`  int NULL DEFAULT NULL ,
`content`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`rating`  int NULL DEFAULT NULL ,
`status`  enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`created_at`  datetime NULL DEFAULT NULL ,
`reviewed_at`  datetime NULL DEFAULT NULL ,
`reviewed_by`  int NULL DEFAULT NULL ,
PRIMARY KEY (`review_id`),
FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `book_id` (`book_id`) USING BTREE ,
INDEX `user_id` (`user_id`) USING BTREE ,
INDEX `reviewed_by` (`reviewed_by`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=2

;

-- ----------------------------
-- Records of book_reviews
-- ----------------------------
BEGIN;
INSERT INTO `book_reviews` (`review_id`, `book_id`, `user_id`, `content`, `rating`, `status`, `created_at`, `reviewed_at`, `reviewed_by`) VALUES ('1', '5', '31', '好书', '5', 'approved', '2026-03-18 07:25:53', '2026-03-18 11:51:05', '32');
COMMIT;

-- ----------------------------
-- Table structure for books
-- ----------------------------
DROP TABLE IF EXISTS `books`;
CREATE TABLE `books` (
`book_id`  int NOT NULL AUTO_INCREMENT ,
`isbn`  varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`title`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`author`  varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`genres`  json NULL DEFAULT NULL ,
`introduction`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL ,
`publish_date`  date NULL DEFAULT NULL ,
`total_copies`  int NULL DEFAULT 1 ,
`available_copies`  int NULL DEFAULT 1 ,
`cover_url`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`douban_link`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`video_link`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`created_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
`updated_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ,
PRIMARY KEY (`book_id`),
UNIQUE INDEX `isbn` (`isbn`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=133

;

-- ----------------------------
-- Records of books
-- ----------------------------
BEGIN;
INSERT INTO `books` (`book_id`, `isbn`, `title`, `author`, `genres`, `introduction`, `publish_date`, `total_copies`, `available_copies`, `cover_url`, `douban_link`, `video_link`, `created_at`) VALUES ('1', '9787020034639', '活着', '余华', '[\"文学\"]', '《活着》讲述了农村人福贵悲惨的人生遭遇。福贵本是个阔少爷，可他嗜赌如命，终于赌光了家业，一贫如洗。他的父亲被他活活气死，母亲则在穷困中患了重病，福贵前去求药，却在途中被国民党抓去当壮丁。经过几番波折回到家里，才知道母亲早已去世，妻子家珍含辛茹苦地养大两个儿女。此后更加悲惨的命运一次又一次降临到福贵身上，他的妻子、儿女和孙子相继死去，最后只剩福贵和一头老牛相依为命，但老人依旧活着，仿佛比往日更加洒脱与坚强。', '2012-08-01', '5', '0', 'https://img9.doubanio.com/view/subject/s/public/s29869926.jpg', 'https://book.douban.com/subject/1082154/', 'https://www.bilibili.com/video/BV1xW411Y7oH', '2026-01-13 00:39:32'), ('2', '9787532736741', '三体', '刘慈欣', '[\"科技\"]', '三体人在利用魔法般的科技锁死了地球人的科学之后，庞大的宇宙舰队杀气腾腾地直扑太阳系，意欲清除地球文明。面对前所未有的危局，经历过无数磨难的地球人组建起同样庞大的太空舰队，同时，利用三体人思维透明的致命缺陷，制订了神秘莫测的\"面壁计划\"，精选出四位\"面壁者\"，秘密展开对三体人的反击。三体人自身虽然无法识破人类的诡谲计谋，却依靠由地球人中的背叛者挑选出的\"破壁人\"，与\"面壁者\"展开智慧博弈……\"面壁计划\"究竟能否成功？地球人究竟能否在这场你死我活的文明生存竞争中战而胜之？神秘的\"黑暗森林\"究竟意味着什么？', '2008-01-01', '3', '0', 'https://img9.doubanio.com/view/subject/s/public/s34850045.jpg', 'https://book.douban.com/subject/2567698/', 'https://www.bilibili.com/video/BV1R4411o7Kq', '2026-01-13 00:39:32'), ('3', '9787208061644', '追风筝的人', '卡勒德·胡赛尼', '[\"文学\"]', '12岁的阿富汗富家少爷阿米尔与仆人哈桑情同手足。然而，在一场风筝比赛后，发生了一件悲惨不堪的事，阿米尔为自己的懦弱感到自责和痛苦，逼走了哈桑，不久，自己也跟随父亲逃往美国。成年后的阿米尔始终无法原谅自己当年对哈桑的背叛。为了赎罪，阿米尔再度踏上暌违二十多年的故乡，希望能为不幸的好友尽最后一点心力，却发现一个惊天谎言，儿时的噩梦再度重演，阿米尔该如何抉择？故事如此残忍而又美丽，作者以温暖细腻的笔法勾勒人性的本质与救赎，读来令人荡气回肠。', '2006-05-01', '4', '0', 'https://img1.doubanio.com/view/subject/s/public/s1727290.jpg', 'https://book.douban.com/subject/1770782/', 'https://www.bilibili.com/video/BV1dW411M7tN', '2026-01-13 00:39:32'), ('4', '9787544253994', '百年孤独', '加西亚·马尔克斯', '[\"文学\"]', '《百年孤独》是哥伦比亚作家加西亚·马尔克斯的代表作，也是拉丁美洲魔幻现实主义文学的巅峰之作。小说讲述了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰，反映了拉丁美洲一个世纪以来风云变幻的历史。作品融入神话传说、民间故事、宗教典故等神秘因素，巧妙地糅合了现实与虚幻，展现出一个瑰丽的想象世界。', '2016-01-01', '2', '0', 'https://img9.doubanio.com/view/subject/s/public/s28372474.jpg', 'https://book.douban.com/subject/6082808/', 'https://www.bilibili.com/video/BV1P4411Z7Hg', '2026-01-13 00:39:32'), ('5', '9787506365437', '平凡的世界', '路遥', '[\"文学\"]', '《平凡的世界》是一部现实主义小说，也是小说化的家族史。作家路遥高度浓缩了中国西北农村的历史变迁过程，作品达到了思想性与艺术性的高度统一。小说以孙少安和孙少平两兄弟为中心，刻画了社会各阶层普通人们的形象，人生的自尊、自强与自信，人生的奋斗与拼搏，挫折与追求，痛苦与欢乐，纷繁地交织，读来令人荡气回肠。', '2012-03-01', '6', '0', 'https://img3.doubanio.com/view/subject/s/public/s27264140.jpg', 'https://book.douban.com/subject/1200840/', 'https://www.bilibili.com/video/BV1hE411t7tB', '2026-01-13 00:39:32'), ('6', '9787020042498', '红楼梦', '曹雪芹', '[\"文学\"]', '《红楼梦》是一部具有世界影响力的人情小说作品，举世公认的中国古典小说巅峰之作，中国封建社会的百科全书，传统文化的集大成者。小说以贾、史、王、薛四大家族的兴衰为背景，以贾宝玉与林黛玉、薛宝钗的爱情婚姻悲剧为主线，刻画了以贾宝玉和金陵十二钗为中心的正邪两赋有情人的人性美和悲剧美。通过家族悲剧、女儿悲剧及主人公的人生悲剧，揭示出封建末世危机。', '2008-07-01', '4', '0', 'https://img1.doubanio.com/view/subject/s/public/s1237549.jpg', 'https://book.douban.com/subject/1007305/', 'https://www.bilibili.com/video/BV1ZW411Y7qQ', '2026-01-13 00:39:32'), ('7', '9787020024753', '围城', '钱钟书', '[\"文学\"]', '《围城》是钱钟书所著的长篇小说，是中国现代文学史上最经典的作品之一。小说以留学生方鸿渐回国后的生活经历为主线，描绘了抗战初期知识分子的群像。作者以幽默讽刺的笔法，深刻揭示了人性的弱点和现代人情感的困境，正如书名所示，婚姻与事业都如同一座被围困的城堡。', '1991-02-01', '3', '0', 'https://img3.doubanio.com/view/subject/s/public/s1070222.jpg', 'https://book.douban.com/subject/1008145/', 'https://www.bilibili.com/video/BV1LW411r7ts', '2026-01-13 00:39:32'), ('8', '9787020034776', '骆驼祥子', '老舍', '[\"文学\"]', '《骆驼祥子》讲述的是旧中国北平城里一个人力车夫祥子的悲剧故事。祥子来自农村，他老实、健壮、坚忍，如同骆驼一般。他来到北平后，选择了拉洋车。他最大的梦想就是拥有一辆自己的车。但是，他的希望一次又一次破灭，他与命运的抗争最终以失败告终。', '2001-05-01', '5', '0', 'https://img1.doubanio.com/view/subject/s/public/s4174218.jpg', 'https://book.douban.com/subject/1043815/', 'https://www.bilibili.com/video/BV1FW411Y7Ft', '2026-01-13 00:39:32'), ('9', '9787544258609', '挪威的森林', '村上春树', '[\"文学\"]', '《挪威的森林》是日本作家村上春树所著的一部长篇爱情小说，故事讲述主角渡边纠缠在情绪不稳定且患有精神疾病的直子和开朗活泼的小林绿子之间，展开了自我成长的旅程。', '2007-07-01', '4', '0', 'https://img1.doubanio.com/view/subject/s/public/s24514468.jpg', 'https://book.douban.com/subject/1046265/', 'https://www.bilibili.com/video/BV1QW411Y7T9', '2026-01-13 00:39:32'), ('10', '9787544258616', '白夜行', '东野圭吾', '[\"文学\"]', '《白夜行》是日本作家东野圭吾的长篇小说，故事围绕着一对有着不同寻常情愫的小学生展开。1973年，大阪的一栋废弃建筑中发现一名遭利器刺死的男子。案件扑朔迷离，悬而未决。此后20年间，案件滋生出的恶逐渐萌芽生长，绽放出恶之花。案件相关者的人生逐渐被越来越重的阴影笼罩……', '2013-01-01', '3', '0', 'https://img1.doubanio.com/view/subject/s/public/s24514468.jpg', 'https://book.douban.com/subject/3259440/', 'https://www.bilibili.com/video/BV1YW411Y7sQ', '2026-01-13 00:39:32'), ('11', '9787536693968', '球状闪电', '刘慈欣', '[\"科技\"]', '《球状闪电》是科幻作家刘慈欣的一部长篇小说，讲述了一个历经球状闪电的男主角对其历尽艰辛的研究里程，向我们展现了一个独特、神秘而离奇的世界。', '2005-06-01', '3', '0', 'https://img2.doubanio.com/view/subject/s/public/s2998168.jpg', 'https://book.douban.com/subject/1205370/', 'https://www.bilibili.com/video/BV1XW411Y7qQ', '2026-01-13 00:39:32'), ('12', '9787536693975', '流浪地球', '刘慈欣', '[\"科技\"]', '《流浪地球》是刘慈欣的科幻小说短篇集，其中包括了《流浪地球》、《乡村教师》等作品。太阳即将毁灭，人类启动地球流浪计划，带着地球去流浪。', '2008-05-01', '4', '0', 'https://img9.doubanio.com/view/subject/s/public/s2996819.jpg', 'https://book.douban.com/subject/26253537/', 'https://www.bilibili.com/video/BV1QW411Y7tT', '2026-01-13 00:39:32'), ('13', '9787020130194', '银河帝国：基地', '艾萨克·阿西莫夫', '[\"科技\"]', '《银河帝国：基地》是艾萨克·阿西莫夫科幻小说\"基地\"系列的第一部。讲述了人类在银河系建立帝国，心理史学家哈里·谢顿预见帝国即将崩溃，于是建立基地，试图缩短黑暗时期的故事。', '2017-08-01', '3', '0', 'https://img3.doubanio.com/view/subject/s/public/s29105258.jpg', 'https://book.douban.com/subject/26389895/', 'https://www.bilibili.com/video/BV1sW411Y7sQ', '2026-01-13 00:39:32'), ('14', '9787020144504', '沙丘', '弗兰克·赫伯特', '[\"科技\"]', '《沙丘》是美国科幻作家弗兰克·赫伯特的经典作品，讲述了少年保罗的家族背叛，他进入沙漠行星沙丘，成为当地弗雷曼人的领袖，并领导他们对抗压迫者的故事。', '2017-12-01', '2', '0', 'https://img1.doubanio.com/cuphead/book-static/pics/book-default-lpic.gif', 'https://book.douban.com/subject/26878124/', 'https://www.bilibili.com/video/BV1zW411Y7qQ', '2026-01-13 00:39:32'), ('15', '9787544291166', '哈利·波特与魔法石', 'J.K.罗琳', '[\"童书\"]', '《哈利·波特与魔法石》是J.K.罗琳创作的小说\"哈利·波特\"系列的第一部。讲述了哈利·波特在霍格沃茨魔法学校第一年的冒险，他与朋友罗恩、赫敏一起发现了魔法石的秘密，并阻止了伏地魔的复活。', '2000-09-01', '5', '0', 'https://img9.doubanio.com/view/subject/s/public/s30014645.jpg', 'https://book.douban.com/subject/1041007/', 'https://www.bilibili.com/video/BV1dW411Y7qQ', '2026-01-13 00:39:32'), ('16', '9787544291173', '哈利·波特与密室', 'J.K.罗琳', '[\"童书\"]', '《哈利·波特与密室》是\"哈利·波特\"系列的第二部。哈利在霍格沃茨的第二年，密室被打开，学生被石化，哈利必须揭开密室的秘密，并面对伏地魔的年轻时代。', '2000-09-01', '5', '0', 'https://img3.doubanio.com/view/subject/s/public/s33542403.jpg', 'https://book.douban.com/subject/1039487/', 'https://www.bilibili.com/video/BV1eW411Y7qQ', '2026-01-13 00:39:32'), ('17', '9787544291180', '哈利·波特与阿兹卡班的囚徒', 'J.K.罗琳', '[\"童书\"]', '《哈利·波特与阿兹卡班的囚徒》是\"哈利·波特\"系列的第三部。哈利在霍格沃茨的第三年，得知小天狼星布莱克从阿兹卡班越狱，据说是他出卖了哈利的父母，哈利决定寻找真相。', '2001-05-01', '5', '1', 'https://img1.doubanio.com/cuphead/book-static/pics/book-default-lpic.gif', 'https://book.douban.com/subject/1071241/', 'https://www.bilibili.com/video/BV1fW411Y7qQ', '2026-01-13 00:39:32'), ('18', '9787020090000', '指环王', 'J.R.R.托尔金', '[\"童书\"]', '《指环王》是英国作家J.R.R.托尔金创作的长篇奇幻小说。故事讲述了霍比特人佛罗多·巴金斯继承了一枚能够统御世界的至尊魔戒，他必须在黑暗势力之前将魔戒摧毁，中土世界的命运就此展开。', '2001-11-01', '3', '0', 'https://img3.doubanio.com/view/subject/s/public/s11276847.jpg', 'https://book.douban.com/subject/1007306/', 'https://www.bilibili.com/video/BV1gW411Y7qQ', '2026-01-13 00:39:32'), ('19', '9787020090017', '霍比特人', 'J.R.R.托尔金', '[\"童书\"]', '《霍比特人》是J.R.R.托尔金创作的奇幻小说，是《指环王》的前传。讲述了霍比特人比尔博·巴金斯与巫师甘道夫和十三个矮人的冒险故事，他在途中发现了至尊魔戒。', '2013-10-01', '3', '0', 'https://img2.doubanio.com/view/subject/s/public/s27222031.jpg', 'https://book.douban.com/subject/1071243/', 'https://www.bilibili.com/video/BV1hW411Y7qQ', '2026-01-13 00:39:32'), ('20', '9787536459772', '冰与火之歌', '乔治·R·R·马丁', '[\"文学\"]', '《冰与火之歌》是美国作家乔治·R·R·马丁创作的史诗奇幻小说系列。故事主要发生在维斯特洛大陆，多个家族争夺铁王座，同时北方长城之外异鬼威胁降临。', '2005-06-01', '4', '0', 'https://img1.doubanio.com/view/subject/s/public/s25641368.jpg', 'https://book.douban.com/subject/25826936/', 'https://www.bilibili.com/video/BV1iW411Y7qQ', '2026-01-13 00:39:32'), ('21', '9787108041531', '万历十五年', '黄仁宇', '[\"历史\"]', '《万历十五年》是历史学家黄仁宇的经典著作。该书以1587年（万历十五年）为切入点，通过对关键历史人物和事件的描述，剖析了明朝衰落的深层原因。', '2006-06-01', '4', '0', 'https://img3.doubanio.com/view/subject/s/public/s24516687.jpg', 'https://book.douban.com/subject/1041482/', 'https://www.bilibili.com/video/BV1jW411Y7qQ', '2026-01-13 00:39:32'), ('22', '9787108052674', '人类简史', '尤瓦尔·赫拉利', '[\"人文社科\"]', '《人类简史：从动物到上帝》是以色列历史学家尤瓦尔·赫拉利所著。该书讲述了从十万年前有生命迹象开始到21世纪资本、科技交织的人类历史。', '2014-11-01', '5', '0', 'https://img9.doubanio.com/view/subject/s/public/s29294226.jpg', 'https://book.douban.com/subject/25985021/', 'https://www.bilibili.com/video/BV1kW411Y7qQ', '2026-01-13 00:39:32'), ('23', '9787108052681', '未来简史', '尤瓦尔·赫拉利', '[\"人文社科\"]', '《未来简史：从智人到智神》是尤瓦尔·赫拉利的作品，聚焦人类未来的新议题，探讨了人工智能、基因工程等科技对人类社会的冲击。', '2017-01-01', '5', '0', 'https://img9.doubanio.com/view/subject/s/public/s28277885.jpg', 'https://book.douban.com/subject/26943161/', 'https://www.bilibili.com/video/BV1lW411Y7qQ', '2026-01-13 00:39:32'), ('24', '9787549550173', '枪炮、病菌与钢铁', '贾雷德·戴蒙德', '[\"人文社科\"]', '《枪炮、病菌与钢铁》是贾雷德·戴蒙德所著，探讨了人类社会不平等的起源，以及地理和环境因素在人类历史发展中的作用。', '2014-08-01', '3', '0', 'https://img3.doubanio.com/view/subject/s/public/s27222202.jpg', 'https://book.douban.com/subject/1813841/', 'https://www.bilibili.com/video/BV1mW411Y7qQ', '2026-01-13 00:39:32'), ('25', '9787108047717', '明朝那些事儿', '当年明月', '[\"历史\"]', '《明朝那些事儿》是当年明月创作的历史普及读物，以通俗幽默的语言讲述明朝三百年的兴衰历史。全书从明太祖朱元璋开国写起，到崇祯皇帝自缢明朝灭亡结束，涵盖了明朝十六帝、王公权贵和小人物的命运。作者以现代人的视角，将历史人物赋予了鲜活的生命力，让读者在轻松阅读中了解明朝的政治、经济、文化变迁。正如作者所说：\"很多人看到的历史是故事，而我看到的是情感，是痛苦、悲伤、挣扎、追悔莫及。\"[citation:1][citation:9]', '2007-04-01', '6', '1', 'https://img9.doubanio.com/view/subject/s/public/s27285200.jpg', 'https://book.douban.com/subject/3674537/', 'https://www.bilibili.com/video/BV1nW411Y7qQ', '2026-01-13 00:39:32'), ('26', '9787549550174', '毛泽东传', '罗斯·特里尔', '[\"历史\"]', '《毛泽东传》是美国学者罗斯·特里尔撰写的毛泽东传记经典。作者以客观中立的视角，全景式地展现了毛泽东从湖南湘潭乡下走出的领袖、政治家、哲学家、诗人的一生。书中通过大量历史资料和访谈，描绘了毛泽东在中国革命和建设中的关键作用，以及他复杂而矛盾的个性。本书在豆瓣获得9.0高分，读者评价\"读这本书，就是在读半部中国现代史\"[citation:2]。', '2013-09-01', '3', '0', 'https://img9.doubanio.com/view/subject/s/public/s27285400.jpg', 'https://book.douban.com/subject/7055446/', 'https://www.bilibili.com/video/BV1oW411Y7qQ', '2026-01-13 00:39:32'), ('27', '9787020096538', '乔布斯传', '沃尔特·艾萨克森', '[\"经管励志\"]', '《史蒂夫·乔布斯传》是沃尔特·艾萨克森撰写的乔布斯唯一授权官方传记。作者与乔布斯面对面交流40多次，并采访其100多位家庭成员、朋友、竞争对手和同事，以不受限的视角呈现了乔布斯如过山车般精彩的人生。他是一位极具创造力的企业家，创造出个人电脑、动画电影、音乐、手机、平板电脑以及数字出版等6大产业的颠覆性变革。乔布斯的个性经常让周围的人愤怒和绝望，但其所创造出的产品也与这种个性息息相关[citation:3][citation:10]。', '2011-11-01', '4', '1', 'https://img9.doubanio.com/view/subject/s/public/s27285000.jpg', 'https://book.douban.com/subject/6798611/', 'https://www.bilibili.com/video/BV1pW411Y7qQ', '2026-01-13 00:39:32'), ('28', '9787201088940', '邓小平时代', '傅高义', '[\"历史\"]', '《邓小平时代》是哈佛大学傅高义教授倾十年心力完成的巨著，是对邓小平跌宕起伏的一生以及中国惊险崎岖的改革开放之路的全景式描述。作者以丰富的史料、国内外重要的研究成果、档案资料和为数众多的独家访谈为基础，对邓小平个人性格及执政风格进行了深层分析，并对中国改革开放史进行了完整而独到的阐释。全书持论严谨、脉络清晰，被誉为邓小平研究\"纪念碑式\"的著作[citation:4]。', '2013-01-18', '3', '0', 'https://img3.doubanio.com/view/subject/s/public/s24516687.jpg', 'https://book.douban.com/subject/20424526/', 'https://www.bilibili.com/video/BV1qW411Y7qQ', '2026-01-13 00:39:32'), ('29', '9787508651903', '原则', '瑞·达利欧', '[\"经管励志\"]', '《原则》是桥水基金创始人瑞·达利欧的人生智慧之作。书中包含21条高原则、139条中原则和365条分原则，涵盖为人处事、公司管理两大方面。达利欧认为，我们可以以那些不变的东西作为行事准则和标杆，避免陷入两难的境地。本书的核心在于研究历史，搞明白相关与因果关系，寻找核心驱动因素，然后通过压力测试不断修正。读者可以针对性取舍，选择适合自己原则并不断实践不断修正[citation:5][citation:6]。', '2018-01-01', '4', '3', 'https://img9.doubanio.com/view/subject/s/public/s29970000.jpg', 'https://book.douban.com/subject/27608239/', 'https://www.bilibili.com/video/BV1rW411Y7qQ', '2026-01-13 00:39:32'), ('30', '9787508689586', '穷查理宝典', '彼得·考夫曼', '[\"经管励志\"]', '《穷查理宝典》收录了查理·芒格过去二十多年来主要的公开演讲，是学习和研究查理芒格投资理念和为人处世智慧的重要材料。查理·芒格是沃伦·巴菲特的搭档，他的智慧影响了无数投资者。书中有一句名言：\"我只想知道将来我会死在什么地方，这样我就永远不去那儿了。\"这本书涵盖了他的投资哲学、心理学误判、多元思维模型等核心思想，是价值投资者的必读书籍[citation:6]。', '2016-08-01', '3', '1', 'https://img9.doubanio.com/view/subject/s/public/s29971000.jpg', 'https://book.douban.com/subject/26831789/', 'https://www.bilibili.com/video/BV1sW411Y7qQ', '2026-01-13 00:39:32'), ('31', '9787508630069', '时间简史', '史蒂芬·霍金', '[\"科技\"]', '《时间简史》是史蒂芬·霍金的科普经典，探索宇宙的起源与命运。霍金以通俗易懂的语言，讲述了宇宙大爆炸、黑洞、时间箭头等前沿概念，让普通读者也能领略宇宙的奥秘。本书自1988年首版以来，累计发行量已达2500万册，被译成近40种语言，被誉为当代有关宇宙科学思想最重要的经典著作，改变了人类对宇宙的观念[citation:7][citation:8]。', '2010-04-01', '4', '1', 'https://img9.doubanio.com/view/subject/s/public/s29972000.jpg', 'https://book.douban.com/subject/1034282/', 'https://www.bilibili.com/video/BV1tW411Y7qQ', '2026-01-13 00:39:32'), ('32', '9787508630076', '果壳中的宇宙', '史蒂芬·霍金', '[\"科技\"]', '《果壳中的宇宙》是史蒂芬·霍金的又一科普力作，获得安万特科学图书奖。该书围绕宇宙学主题，涉及广义相对论、量子论、黑洞、暴胀、时间旅行、弦论、超引力等诸多前沿概念。全书共七章，从相对论简史到膜的新奇世界，霍金以其独特的想象力带领读者遨游广袤的时空，探索宇宙之谜。书名源自莎士比亚名言：\"即便我身处果壳之中，仍自以为是无限宇宙之王\"[citation:8]。', '2002-01-01', '3', '0', 'https://img9.doubanio.com/view/subject/s/public/s29973000.jpg', 'https://book.douban.com/subject/1034283/', 'https://www.bilibili.com/video/BV1uW411Y7qQ', '2026-01-13 00:39:32'), ('33', '9787535774709', '上帝掷骰子吗', '曹天元', '[\"科技\"]', '《上帝掷骰子吗》是曹天元创作的量子物理科普读物，被誉为中文科普第一书。这本书没有枯燥的定理和公式，作者大量使用类比的例子，给读者展现了一段精彩的量子物理历史。从光的粒子说到EPR佯谬，从薛定谔的猫到量子纠缠，读者可以了解到这门科学的发展历程以及基本的量子物理理论。豆瓣评分高达9.2，是科普爱好者的必读之作[citation:6][citation:7]。', '2013-10-01', '5', '3', 'https://img9.doubanio.com/view/subject/s/public/s29974000.jpg', 'https://book.douban.com/subject/1467022/', 'https://www.bilibili.com/video/BV1vW411Y7qQ', '2026-01-13 00:39:32'), ('34', '9787020090001', '从一到无穷大', '乔治·伽莫夫', '[\"科技\"]', '《从一到无穷大》是乔治·伽莫夫的科普经典，以生动的语言介绍了数学、物理学、生物学等领域的核心概念。从数字游戏到时空相对性，从微观世界到宏观宇宙，伽莫夫带领读者进行了一场科学的奇妙旅行。本书是\"无穷大\"级数的科普经典，影响了几代科学爱好者。豆瓣评分9.1，是入门科学的绝佳选择[citation:7]。', '2002-11-01', '4', '2', 'https://img9.doubanio.com/view/subject/s/public/s29975000.jpg', 'https://book.douban.com/subject/1102715/', 'https://www.bilibili.com/video/BV1wW411Y7qQ', '2026-01-13 00:39:32'), ('35', '9787535774723', '万物简史', '比尔·布莱森', '[\"科技\"]', '《万物简史》是比尔·布莱森创作的科普巨著，以幽默风趣的笔触讲述了科学发展的历程。从宇宙大爆炸到生命起源，从原子结构到人类进化，布莱森将复杂的科学知识转化为引人入胜的故事。本书荣获多项科普图书奖，被誉为\"科普版的《人类群星闪耀时》\"。豆瓣评分8.7，适合所有对世界充满好奇的读者[citation:7]。', '2005-02-01', '3', '1', 'https://img9.doubanio.com/view/subject/s/public/s29976000.jpg', 'https://book.douban.com/subject/1225983/', 'https://www.bilibili.com/video/BV1xW411Y7qQ', '2026-01-13 00:39:32'), ('36', '9787535774730', '生命是什么', '埃尔温·薛定谔', '[\"科技\"]', '《生命是什么》是诺贝尔物理学奖得主埃尔温·薛定谔的经典著作，被公认为分子生物学的奠基之作。1943年，薛定谔在都柏林三一学院的演讲中，用物理学和化学的观点探讨了生命的本质、遗传机制等问题，启发了后来DNA双螺旋结构的发现。这本书跨越了物理学与生物学的界限，至今仍具有深远影响[citation:7]。', '2007-04-01', '2', '0', 'https://img9.doubanio.com/view/subject/s/public/s29977000.jpg', 'https://book.douban.com/subject/1047336/', 'https://www.bilibili.com/video/BV1yW411Y7qQ', '2026-01-13 00:39:32'), ('37', '9787535774747', '宇宙的琴弦', '布赖恩·格林', '[\"科技\"]', '《宇宙的琴弦》是布赖恩·格林创作的弦理论科普经典。格林以生动形象的比喻，向读者介绍了弦理论这一试图统一广义相对论和量子力学的前沿理论。书中讲述了从爱因斯坦的梦想到弦理论的诞生，从额外维度的概念到多重宇宙的假说，带领读者探索时空的本质。本书是理解现代物理学前沿的最佳入门读物[citation:7]。', '2007-01-01', '3', '1', 'https://img9.doubanio.com/view/subject/s/public/s29978000.jpg', 'https://book.douban.com/subject/1395454/', 'https://www.bilibili.com/video/BV1zW411Y7qQ', '2026-01-13 00:39:32'), ('38', '9787535774754', '复杂', '梅拉妮·米歇尔', '[\"科技\"]', '《复杂》是梅拉妮·米歇尔创作的复杂系统科学入门读物。从蚁群到大脑，从免疫系统到互联网，复杂系统无处不在。米歇尔用生动的案例介绍了混沌、涌现、遗传算法、元胞自动机等核心概念，揭示了简单规则如何产生复杂行为。这本书是理解非线性科学、人工智能和系统思维的绝佳选择[citation:7]。', '2011-06-01', '4', '2', 'https://img9.doubanio.com/view/subject/s/public/s29979000.jpg', 'https://book.douban.com/subject/6749832/', 'https://www.bilibili.com/video/BV1AW411Y7qQ', '2026-01-13 00:39:32'), ('39', '9787535774761', '基因组', '马特·里德利', '[\"科技\"]', '《基因组》是马特·里德利创作的遗传学科普经典。作者以人类23对染色体为线索，每对染色体讲述一个与基因相关的故事，从疾病到智力，从性格到寿命，揭示了基因如何塑造我们。书中既有前沿科学知识，又有人文关怀，帮助读者理解\"人类基因组计划\"的意义。里德利以优雅的文笔，将复杂的遗传学知识变得通俗易懂[citation:7]。', '2006-01-01', '3', '0', 'https://img9.doubanio.com/view/subject/s/public/s29980000.jpg', 'https://book.douban.com/subject/1052939/', 'https://www.bilibili.com/video/BV1BW411Y7qQ', '2026-01-13 00:39:32'), ('40', '9787535774778', '自私的基因', '理查德·道金斯', '[\"科技\"]', '《自私的基因》是理查德·道金斯创作的进化论经典，提出了\"基因中心论\"的革命性观点。道金斯认为，我们和其他动物都是基因的生存机器，进化的基本单位不是物种，而是基因。书中还提出了\"模因\"概念，解释了文化传播的机制。这本书颠覆了人们对自然选择和生物进化的理解，是20世纪最具影响力的科普著作之一[citation:6][citation:7]。', '2012-09-01', '5', '3', 'https://img9.doubanio.com/view/subject/s/public/s29981000.jpg', 'https://book.douban.com/subject/11445548/', 'https://www.bilibili.com/video/BV1CW411Y7qQ', '2026-01-13 00:39:32'), ('41', '9787020002207', '红楼梦', '曹雪芹', '[\"文学\"]', '《红楼梦》是一部具有世界影响力的人情小说作品，举世公认的中国古典小说巅峰之作，中国封建社会的百科全书，传统文化的集大成者。小说以贾、史、王、薛四大家族的兴衰为背景，以贾宝玉与林黛玉、薛宝钗的爱情婚姻悲剧为主线，刻画了以贾宝玉和金陵十二钗为中心的正邪两赋有情人的人性美和悲剧美。通过家族悲剧、女儿悲剧及主人公的人生悲剧，揭示出封建末世危机。', '1996-11-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s1070959.jpg', null, null, '2026-03-13 01:20:53'), ('42', '9787020008728', '水浒传', '施耐庵', '[\"文学\"]', '《水浒传》是我国第一部以农民起义为题材的长篇章回小说，讲述了北宋末年以宋江为首的108位好汉在梁山起义，以及聚义之后接受招安、四处征战的故事。小说深刻揭示了朝政腐败和社会矛盾，塑造了宋江、林冲、武松、鲁智深等一批栩栩如生、性格鲜明的英雄形象。', '1997-01-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s1071261.jpg', null, null, '2026-03-13 01:20:53'), ('43', '9787020008711', '三国演义', '罗贯中', '[\"历史\"]', '《三国演义》是中国第一部长篇章回体历史演义小说，以描写东汉末年至西晋初年近百年间的历史风云为主线，集中描绘了魏、蜀、吴三国之间的政治、军事和外交斗争。小说成功塑造了诸葛亮、曹操、关羽、张飞等众多栩栩如生的人物形象，其战争描写和计谋运用更是出神入化，对后世产生了深远影响。', '1998-05-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s1071290.jpg', null, null, '2026-03-13 01:20:53'), ('44', '9787020008735', '西游记', '吴承恩', '[\"文学\"]', '《西游记》是中国古代第一部浪漫主义章回体长篇神魔小说。小说以“唐僧取经”这一历史事件为蓝本，通过作者的艺术加工，深刻地描绘了唐代僧人玄奘与孙悟空、猪八戒、沙僧不畏艰险，一路降妖伏魔，最终到达西天取得真经的故事。小说想象奇特，人物形象深入人心，是中国神魔小说的经典之作。', '2004-08-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s1071301.jpg', null, null, '2026-03-13 01:20:53'), ('45', '9787020036206', '儒林外史', '吴敬梓', '[\"文学\"]', '《儒林外史》是清代吴敬梓创作的长篇小说，代表着中国古代讽刺小说的高峰。全书以写实主义手法描绘了各类人士对于“功名富贵”的不同表现，对当时吏治的腐败、科举的弊端、礼教的虚伪等进行了深刻的批判和嘲讽。书中范进中举、严监生临终等故事已成为中国文学中的经典讽刺形象。', '2007-11-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s2875601.jpg', null, null, '2026-03-13 01:20:53'), ('46', '9787020026283', '聊斋志异', '蒲松龄', '[\"文学\"]', '《聊斋志异》是清代蒲松龄创作的文言短篇小说集，是中国古典文言小说的巅峰之作。全书近五百篇，内容或揭露封建统治的黑暗，或抨击科举制度的腐朽，或反抗封建礼教的束缚，其中以描写花妖狐魅与人之间的爱情故事最为动人，想象丰富，情节曲折，人物形象鲜明。', '1989-09-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s1137603.jpg', null, null, '2026-03-13 01:20:53'), ('47', '9787020032499', '史记（全十册）', '司马迁', '[\"历史\"]', '《史记》是中国第一部纪传体通史，由西汉司马迁历时十余年撰写而成。全书包括十二本纪、三十世家、七十列传、十表、八书，记载了从传说中的黄帝时期到汉武帝太初年间长达三千多年的历史。它不仅是一部伟大的史学著作，也是一部优秀的文学作品，鲁迅先生誉之为“史家之绝唱，无韵之离骚”。', '2005-04-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s1677204.jpg', null, null, '2026-03-13 01:20:53'), ('48', '9787020070644', '诗经', '佚名', '[\"文学\"]', '《诗经》是中国最早的诗歌总集，收集了西周初年至春秋中叶的诗歌共311篇，反映了周初至周晚期约五百年间的社会面貌。诗经在内容上分为《风》《雅》《颂》三个部分，表现手法有赋、比、兴。它是中国现实主义文学的开端，对后世诗歌创作产生了深远影响。', '2012-06-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s27251484.jpg', null, null, '2026-03-13 01:20:53'), ('49', '9787020092028', '浮生六记', '沈复', '[\"文学\"]', '《浮生六记》是清代沈复的自传体散文随笔。书中以作者夫妇生活为主线，描绘了平凡而又充满情趣的居家生活，以及他们在坎坷生活中相濡以沫的深情。文字清新真率，无雕琢藻饰痕迹，情真意切。书中记录了沈复一生的悲欢离合，以及游历四方的见闻，展现了一种清雅脱俗的生存智慧。', '2010-04-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s4386809.jpg', null, null, '2026-03-13 01:20:53'), ('50', '9787532122537', '边城', '沈从文', '[\"文学\"]', '《边城》是沈从文创作的中篇小说，被誉为中国文学史上“一部证明人性至美”的田园诗作。小说以20世纪30年代川湘交界的边城小镇茶峒为背景，以兼具抒情诗和小品文的优美笔触，描绘了湘西地区特有的风土人情；借船家少女翠翠的纯爱故事，展现出了人性的善良美好与心灵的澄澈纯净。', '2002-04-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s2737671.jpg', null, null, '2026-03-13 01:20:53'), ('51', '9787020026900', '白鹿原', '陈忠实', '[\"文学\"]', '《白鹿原》是作家陈忠实创作的长篇小说，历时六年创作完成。小说以陕西关中地区白鹿原上白鹿村为缩影，通过讲述白姓和鹿姓两大家族祖孙三代的恩怨纷争，表现了从清朝末年到二十世纪七八十年代长达半个多世纪的历史变迁。小说人物形象饱满，语言质朴厚重，具有深刻的史诗意味。', '1993-06-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s1045560.jpg', null, null, '2026-03-13 01:20:53'), ('52', '9787506345392', '黄金时代', '王小波', '[\"文学\"]', '《黄金时代》是作家王小波的代表作品，收录了其“时代三部曲”系列中的同名小说。小说以文化大革命时期为背景，讲述了知识青年王二与医生陈清扬之间超越时代束缚的情感与生存故事。作品以大胆直白的性描写和黑色幽默的叙事风格，展现了对荒谬时代的反讽和对个体自由的追求。', '2014-02-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s28022182.jpg', null, null, '2026-03-13 01:20:53'), ('53', '9787530212998', '呼兰河传', '萧红', '[\"文学\"]', '《呼兰河传》是萧红创作的长篇小说，以其童年生活为线索，描绘了东北边陲小城呼兰的风土人情。小说没有贯穿全文的故事情节，而是通过一个个独立的小故事，刻画了小城居民的愚昧、麻木与不幸，同时也展现了祖父的慈爱和后花园的温暖。作品笔调细腻，情感深沉，是中国现代文学的经典之作。', '2014-09-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s28286221.jpg', null, null, '2026-03-13 01:20:53'), ('54', '9787020026740', '家', '巴金', '[\"文学\"]', '《家》是巴金《激流三部曲》中的第一部，也是其代表作。小说以五四运动后的中国为背景，讲述了成都一个封建大家庭高公馆的没落过程。通过描写觉慧、觉民、觉新三兄弟不同的思想和生活道路，深刻揭露了封建礼教的罪恶，歌颂了青年一代的觉醒与反抗。', '2000-07-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s1014612.jpg', null, null, '2026-03-13 01:20:53'), ('55', '9787020026139', '子夜', '茅盾', '[\"文学\"]', '《子夜》是茅盾的代表作，是中国现代文学史上第一部社会分析小说。小说以20世纪30年代的上海为背景，围绕着民族资本家吴荪甫与买办资本家赵伯韬之间的商战展开，全景式地描绘了当时中国社会的复杂矛盾，展现了民族工业在帝国主义和买办资本压迫下的悲剧命运。', '1960-04-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s2193736.jpg', null, null, '2026-03-13 01:20:53'), ('56', '9787020002498', '茶馆', '老舍', '[\"文学\"]', '《茶馆》是“人民艺术家”老舍的经典话剧作品。剧本以北京裕泰茶馆为舞台，通过三幕戏分别展现了清末、民国初年、抗战胜利后三个历史时期的社会生活，刻画了王利发、常四爷、秦仲义等数十位人物的悲惨命运。作品以小见大，深刻揭示了旧中国的必然灭亡，是中国话剧史上的瑰宝。', '1994-09-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s1046697.jpg', null, null, '2026-03-13 01:20:53'), ('57', '9787020026276', '雷雨', '曹禺', '[\"文学\"]', '《雷雨》是剧作家曹禺的处女作，也是其代表作，是中国现代话剧成熟的里程碑。故事围绕周、鲁两家复杂的血缘和情感纠葛展开，在一天之内集中展现了伪善的资本家周朴园与后妻繁漪、以及失散多年的妻子侍萍之间的激烈冲突，最终以悲剧收场，深刻揭露了封建家庭的腐朽与罪恶。', '1994-09-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s1089287.jpg', null, null, '2026-03-13 01:22:54'), ('60', '9787544210621', '废都', '贾平凹', '[\"文学\"]', '《废都》是贾平凹创作的长篇小说。小说以古都西安为背景，讲述了作家庄之蝶在名利场中的沉沦与挣扎，展现了20世纪80年代末中国知识分子的精神困境。作品以大胆的性描写和独特的“□□”删节手法引起巨大反响和争议，成为中国当代文学史上具有标志性的作品。', '1993-06-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s1139326.jpg', null, null, '2026-03-13 01:22:41'), ('61', '9787020078800', '城南旧事', '林海音', '[\"文学\"]', '《城南旧事》是台湾女作家林海音的代表作。小说通过主人公英子童稚的双眼，观看大人世界的悲欢离合，展现了20世纪20年代末北京城南的市井生活。全书包括《惠安馆》《我们看海去》《兰姨娘》等五个短篇，文笔清新淡雅，情感真挚，弥漫着淡淡的哀愁与沉沉的相思。', '2012-04-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s27373253.jpg', null, null, '2026-03-13 01:22:41'), ('62', '9787020078299', '撒哈拉的故事', '三毛', '[\"生活\"]', '《撒哈拉的故事》是台湾作家三毛最负盛名的散文集。书中记录了三毛与丈夫荷西在撒哈拉沙漠生活的一系列见闻和经历。她用幽默细腻的笔触，描绘了大漠的辽阔与残酷，以及当地居民的独特风情，将枯燥的沙漠生活过得充满诗意与浪漫，展现了她对自由和生命的热爱。', '2011-07-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s27314862.jpg', null, null, '2026-03-13 01:22:41'), ('63', '9787020040012', '红高粱家族', '莫言', '[\"文学\"]', '《红高粱家族》是莫言的代表作之一，由《红高粱》《高粱酒》等五个中篇小说组成。小说以抗日战争为背景，讲述了高密东北乡的抗日故事，塑造了“我爷爷”余占鳌和“我奶奶”戴凤莲等敢爱敢恨、充满生命力的草莽英雄形象。作品以其天马行空的想象和独特的叙事风格，成为寻根文学的经典。', '2000-08-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s1077911.jpg', null, null, '2026-03-13 01:22:41'), ('64', '9787020046809', '尘埃落定', '阿来', '[\"文学\"]', '《尘埃落定》是藏族作家阿来的长篇小说，获第五届茅盾文学奖。小说讲述了一个声势显赫的藏族土司，在酒后和汉族太太生了一个傻瓜儿子。这个人人都认定的傻子，却有着超越时代的预感。故事通过“傻子”的视角，展现了土司制度在历史洪流中的兴衰与尘埃落定。', '2005-01-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s1511778.jpg', null, null, '2026-03-13 01:22:41'), ('65', '9787020063745', '额尔古纳河右岸', '迟子建', '[\"文学\"]', '《额尔古纳河右岸》是迟子建的长篇小说，获第七届茅盾文学奖。小说以一位年近九旬的鄂温克族最后一位女酋长的自述口吻，讲述了这个游猎民族百年的沧桑历史。他们信奉萨满，与驯鹿相依为命，在严酷的自然环境和现代文明的挤压下，展现出了顽强的生命力和独特的民族精神。', '2008-11-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s33432945.jpg', null, null, '2026-03-13 01:22:41'), ('66', '9787544250580', '杀死一只知更鸟', '哈珀·李', '[\"文学\"]', '《杀死一只知更鸟》是美国女作家哈珀·李发表于1960年的长篇小说，获普利策奖。小说通过六岁女孩斯库特的视角，讲述其父亲阿提克斯·芬奇在种族歧视严重的南方小镇，为一名被诬告强奸白人妇女的黑人辩护的故事。小说探讨了种族不平等、善恶、勇气与良知等主题，是美国图书馆借阅率最高的图书之一。', '2012-09-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s24516456.jpg', null, null, '2026-03-13 01:22:41'), ('67', '9787530216798', '动物农场', '乔治·奥威尔', '[\"人文社科\"]', '《动物农场》是乔治·奥威尔最优秀的作品之一，是一则反乌托伯的政治寓言。小说讲述了一个农场的动物成功进行“革命”，将人类赶走，并建立了一个平等的动物社会。然而，领导者猪最终却成为了比人类更加独裁的剥削者。奥威尔用辛辣的笔触讽刺了被异化的革命和权力对人的腐蚀。', '2015-03-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s28294197.jpg', null, null, '2026-03-13 01:22:41'), ('68', '9787530216781', '一九八四', '乔治·奥威尔', '[\"人文社科\"]', '《一九八四》是乔治·奥威尔创作的反乌托邦小说经典。小说虚构了一个高度集权的极权社会“大洋国”，在这里，“老大哥”在注视着每一个人，思想警察无处不在，历史可以随时被篡改。主人公温斯顿试图追求自由和真相，最终却被彻底摧毁。作品深刻揭示了极权主义的恐怖。', '2015-03-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s28294196.jpg', null, null, '2026-03-13 01:22:41'), ('70', '9787544253995', '月亮与六便士', '毛姆', '[\"文学\"]', '《月亮与六便士》是英国作家毛姆的长篇小说。小说以法国后印象派画家保罗·高更为原型，讲述了主人公查尔斯·斯特里克兰德，一个原本平凡的伦敦证券经纪人，突然着了艺术的魔，抛妻弃子，远赴南太平洋的塔希提岛，用画笔谱写出自己光辉灿烂的生命的故事。探讨了理想与现实、艺术与生活的矛盾。', '2016-01-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s28372474.jpg', null, null, '2026-03-13 20:01:18'), ('71', '9787532749550', '人性的枷锁', '毛姆', '[\"文学\"]', '《人性的枷锁》是毛姆的长篇半自传体小说，也是其代表作。小说讲述了主人公菲利普·凯里从童年到成年的成长历程，他自幼父母双亡，又身患残疾，在经历了宗教、教育、爱情、友谊的重重枷锁后，最终摆脱束缚，找到了人生的意义。小说深刻剖析了人性的弱点和复杂。', '2016-04-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s28897210.jpg', null, null, '2026-03-13 01:23:02'), ('72', '9787532754939', '刀锋', '毛姆', '[\"文学\"]', '《刀锋》是毛姆晚年的重要作品。小说以第一次世界大战后为背景，讲述了美国青年拉里·达雷尔在战争中目睹好友为救自己牺牲后，开始对人生感到迷惘，他拒绝工作和爱情，远赴印度，最终在东方哲学中找到了人生的答案。小说探讨了人生的终极意义。', '2016-04-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s28897211.jpg', null, null, '2026-03-13 01:23:02'), ('73', '9787532754267', '局外人', '阿尔贝·加缪', '[\"文学\"]', '《局外人》是法国作家阿尔贝·加缪的代表作，是存在主义文学的经典。小说讲述了一个叫默尔索的小职员，因在烈日下冲动杀人而被法庭审判。然而，审判的重点并非杀人事件本身，而是他在母亲葬礼上没有哭泣等“有悖人伦”的行为，最终他被判处死刑。小说揭示了世界的荒诞和人个体的孤独。', '2013-08-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s27494447.jpg', null, null, '2026-03-13 01:23:02'), ('74', '9787532754274', '鼠疫', '阿尔贝·加缪', '[\"文学\"]', '《鼠疫》是加缪的重要长篇小说。小说讲述了北非一个叫奥兰的城市在突发鼠疫后，以里厄医生为代表的一批人奋起抗争的故事。小说不仅生动描绘了疫情下人们的恐慌、焦虑与挣扎，更深刻歌颂了在与瘟疫的殊死搏斗中，人类所展现出的反抗精神和人道主义光辉。', '2013-08-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s27494446.jpg', null, null, '2026-03-13 01:23:02'), ('75', '9787532754281', '西西弗神话', '阿尔贝·加缪', '[\"人文社科\"]', '《西西弗神话》是加缪的哲学随笔集，与《局外人》《卡利古拉》并称为“荒诞三部曲”。书中阐述了加缪的荒诞哲学：世界是非理性的，而人却渴望追求清晰和统一，这种冲突就是“荒诞”。加缪以西西弗日复一日推石上山却终究徒劳的比喻，探讨了在荒诞的世界里，人为何要继续活下去。', '2013-08-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s27494448.jpg', null, null, '2026-03-13 01:23:02'), ('76', '9787532740267', '战争与和平', '列夫·托尔斯泰', '[\"文学\", \"历史\"]', '《战争与和平》是俄国作家列夫·托尔斯泰的鸿篇巨制，是世界文学史上的不朽丰碑。小说以1812年俄法战争为中心，将“战争”与“和平”两个场景交织，描绘了安德烈、皮埃尔、娜塔莎等众多人物的命运起伏，全景式地展现了俄国社会从1805年到1820年间的重大历史事件，探讨了命运、自由、历史与个人等宏大主题。', '2010-06-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s4467727.jpg', null, null, '2026-03-13 01:23:02'), ('77', '9787532740281', '安娜·卡列尼娜', '列夫·托尔斯泰', '[\"文学\"]', '《安娜·卡列尼娜》是托尔斯泰的另一部里程碑式作品。小说通过两条主线——安娜追求浪漫爱情而走向毁灭，以及列文探索农业改革与生命意义——展现了19世纪俄国社会的深刻变革。安娜的形象深入人心，她的悲剧揭示了当时社会对女性的压迫以及个人幸福与世俗道德之间的冲突。', '2010-06-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4406612.jpg', null, null, '2026-03-13 01:23:02'), ('78', '9787532740298', '复活', '列夫·托尔斯泰', '[\"文学\"]', '《复活》是托尔斯泰晚年最后一部长篇小说，也是他一生思想和艺术探索的总结。小说讲述了贵族青年聂赫留朵夫在法庭上认出被诬告的妓女正是当年被他诱奸的农奴少女玛丝洛娃后，良心发现，为她奔走伸冤，并最终选择灵魂复活的故事。作品对沙皇俄国社会的方方面面进行了深刻的批判。', '2010-06-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s4463134.jpg', null, null, '2026-03-13 01:23:02'), ('79', '9787532754588', '罪与罚', '陀思妥耶夫斯基', '[\"文学\"]', '《罪与罚》是俄国作家陀思妥耶夫斯基的代表作之一。小说讲述了贫穷的法科大学生拉斯柯尼科夫因创立一套“超人”理论，杀死了一个放高利贷的老太婆，从此陷入了无尽的内心折磨与忏悔之中。作品以极其细腻的心理描写，深刻探讨了罪恶、惩罚、救赎与人性的复杂性。', '2015-01-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s28111592.jpg', null, null, '2026-03-13 01:23:02'), ('80', '9787532756353', '卡拉马佐夫兄弟', '陀思妥耶夫斯基', '[\"文学\"]', '《卡拉马佐夫兄弟》是陀思妥耶夫斯基的巅峰之作，也是其思想探索的集大成者。小说围绕卡拉马佐夫一家父子、兄弟之间因情欲、金钱和信仰而引发的激烈冲突，特别是老卡拉马佐夫被杀案，探讨了上帝、自由、善恶、理性与信仰等人类终极问题。', '2015-02-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s28323615.jpg', null, null, '2026-03-13 01:23:02'), ('81', '9787532742100', '悲惨世界', '雨果', '[\"文学\", \"历史\"]', '《悲惨世界》是法国作家雨果的代表作，一部气势恢宏的社会史诗。小说以主人公冉阿让的悲惨经历为主线，串联起从拿破仑战争到巴黎起义的20余年法国历史。书中描绘了下层人民的苦难，歌颂了人性向善的力量，深刻探讨了正义、法律、爱与救赎。', '2010-08-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4616616.jpg', null, null, '2026-03-13 01:23:02'), ('82', '9787532754366', '巴黎圣母院', '雨果', '[\"文学\", \"艺术\"]', '《巴黎圣母院》是雨果的浪漫主义文学杰作。小说以15世纪的巴黎为背景，围绕美丽的吉普赛女郎爱斯梅拉达、外表丑陋内心善良的敲钟人卡西莫多、道貌岸然的副主教弗罗洛展开了一段荡气回肠的爱情悲剧。小说深刻揭露了宗教的虚伪，歌颂了下层人民的高尚品格。', '2010-08-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4616534.jpg', null, null, '2026-03-13 01:23:02'), ('83', '9787532754373', '红与黑', '司汤达', '[\"文学\"]', '《红与黑》是法国作家司汤达的代表作，开创了后世“意识流小说”和“心理小说”的先河。小说围绕主人公于连的个人奋斗与最终失败，尤其是他与两位女性的情感纠葛，深刻描绘了19世纪30年代法国社会的现实，对复辟王朝时期的社会矛盾和教会势力的黑暗进行了犀利批判。', '2010-08-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4616578.jpg', null, null, '2026-03-13 01:23:02'), ('84', '9787532743190', '基督山伯爵', '大仲马', '[\"文学\"]', '《基督山伯爵》是大仲马的通俗小说代表作，被誉为“复仇爽文”的鼻祖。小说讲述了年轻水手爱德蒙·邓蒂斯遭人陷害，身陷囹圄十四载，后在狱中获知宝藏秘密，越狱后化身基督山伯爵，向所有仇人展开一系列快意恩仇的复仇计划。故事情节曲折，悬念迭起，引人入胜。', '2010-08-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s4616940.jpg', null, null, '2026-03-13 01:23:02'), ('85', '9787532754380', '呼啸山庄', '艾米莉·勃朗特', '[\"文学\"]', '《呼啸山庄》是艾米莉·勃朗特创作的一部充满反抗精神和奇异想象力的杰作。小说讲述了弃儿希斯克利夫与庄园主的女儿凯瑟琳之间因社会地位差异而产生的刻骨铭心却又充满仇恨的爱情故事。全书充满阴郁和狂暴的气息，揭示了人性的扭曲与人间的冷酷。', '2010-08-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4616615.jpg', null, null, '2026-03-13 01:23:02'), ('86', '9787801734976', '大卫·科波菲尔', '查尔斯·狄更斯', '[\"文学\"]', '《大卫·科波菲尔》是狄更斯最重要且耗费心血最多、篇幅最长的一部半自传体著作，是他“最宠爱的孩子”。小说讲述了孤儿大卫·科波菲尔从幼年到中年的成长历程，描绘了他身边形形色色的人物，如善良的保姆佩格蒂、卑鄙的谋得斯通、穷困潦倒的米考伯先生等。列夫·托尔斯泰誉其为“一切英国小说中最好的一部”。', '2006-01-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s1735171.jpg', null, null, '2026-03-13 01:23:02'), ('87', '9787532743213', '双城记', '查尔斯·狄更斯', '[\"文学\", \"历史\"]', '《双城记》是狄更斯以法国大革命为背景创作的历史小说。小说将巴黎和伦敦两座城市紧密联系在一起，围绕马奈特医生一家和德法日太太等人的命运展开。书中深刻揭示了革命前夕贵族阶级的腐朽以及底层民众的苦难，同时也通过卡顿的自我牺牲，歌颂了人性的光辉与爱。', '2010-08-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4617029.jpg', null, null, '2026-03-13 01:23:02'), ('88', '9787532743091', '包法利夫人', '福楼拜', '[\"文学\"]', '《包法利夫人》是法国作家福楼拜的代表作，被公认为现代小说的开山之作。小说讲述了农家女艾玛·包法利因不甘于平庸的婚姻生活，追求浪漫与奢华，最终债台高筑，服毒自杀的悲剧。福楼拜以近乎科学家的精确笔触，剖析了人物的心理和欲望，揭示了浪漫主义幻想与平庸现实之间的冲突。', '2010-08-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4617076.jpg', null, null, '2026-03-13 01:23:02'), ('89', '9787532743077', '老人与海', '海明威', '[\"文学\"]', '《老人与海》是海明威的巅峰之作，为他赢得了诺贝尔文学奖。小说讲述了老渔夫圣地亚哥在连续84天没捕到鱼的情况下，终于独自钓上了一条大马林鱼，但在返航途中却遭到鲨鱼的围攻，最终只带回一副鱼骨架的故事。小说塑造了“硬汉”形象，歌颂了人类面对困境时不屈不挠的斗争精神。', '2010-08-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4616792.jpg', null, null, '2026-03-13 01:23:02'), ('90', '9787532754397', '瓦尔登湖', '梭罗', '[\"生活\", \"人文社科\"]', '《瓦尔登湖》是美国作家梭罗在瓦尔登湖畔隐居两年多的生活记录和哲思随笔。书中详细记录了他在湖畔的简朴生活，如耕种、阅读、与自然为伴，并以此为基础，深刻批判了当时社会的物质主义和人们盲目追求财富的生活方式，倡导回归自然、简化生活、寻求精神富足。', '2009-06-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s3842026.jpg', null, null, '2026-03-13 01:23:02'), ('91', '9787532736932', '不能承受的生命之轻', '米兰·昆德拉', '[\"文学\", \"人文社科\"]', '《不能承受的生命之轻》是米兰·昆德拉最负盛名的作品。小说以1968年苏联入侵捷克为背景，围绕托马斯、特蕾莎、萨宾娜等人物之间的感情纠葛，探讨了生命中的轻与重、灵与肉、媚俗与反媚俗等一系列哲学命题。书中既有深刻的思想，又有优美的文笔。', '2010-06-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4266932.jpg', null, null, '2026-03-13 01:23:02'), ('92', '9787020075175', '雪国', '川端康成', '[\"文学\", \"艺术\"]', '《雪国》是日本作家川端康成的代表作，也是他获得诺贝尔文学奖的三部作品之一。小说讲述了舞蹈艺术研究家岛村三次前往雪国与当地艺伎驹子之间的情感纠葛，以及他与少女叶子之间的朦胧情愫。小说充满了浓郁的日本美学情调，以虚无和哀愁为基调，展现了“物哀”之美。', '2013-08-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s27284780.jpg', null, null, '2026-03-13 01:23:02'), ('93', '9787544270878', '解忧杂货店', '东野圭吾', '[\"文学\"]', '《解忧杂货店》是东野圭吾的温情治愈代表作。故事围绕一家废弃杂货店展开，人们将烦恼写成信投进卷帘门的投信口，第二天就会在店后的牛奶箱里得到回答。跨越时空的信件连接起不同人的命运，讲述了一个个温暖又充满希望的故事，探讨了爱、救赎与人生选择。', '2014-05-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s28048702.jpg', null, null, '2026-03-13 01:23:02'), ('94', '9787544258209', '白夜行', '东野圭吾', '[\"文学\", \"悬疑\"]', '《白夜行》是东野圭吾的巅峰推理之作。小说围绕一对有着悲惨命运的少年少女展开，1973年大阪的一桩凶杀案牵出跨度近20年的故事，桐原亮司和唐泽雪穗在白夜中相互依存，他们的人生被罪恶、谎言与绝望笼罩，展现了人性深处的黑暗与挣扎。', '2013-01-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s27683770.jpg', null, null, '2026-03-13 01:23:02'), ('95', '9787020090002', '百年孤独', '加西亚·马尔克斯', '[\"文学\"]', '《百年孤独》是魔幻现实主义文学的巅峰之作，为马尔克斯赢得诺贝尔文学奖。小说讲述了布恩迪亚家族七代人的传奇故事，以及马孔多小镇从兴起、繁荣到消亡的全过程，融合了神话、传说、宗教典故与现实，展现了拉丁美洲一个世纪以来风云变幻的历史。', '2011-06-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s27683769.jpg', null, null, '2026-03-13 01:23:02'), ('96', '9787544295166', '霍乱时期的爱情', '加西亚·马尔克斯', '[\"文学\"]', '《霍乱时期的爱情》是马尔克斯晚年的爱情史诗。小说讲述了弗洛伦蒂诺·阿里萨与费尔明娜·达萨跨越半个多世纪的爱情故事，从青涩的初恋到迟暮的相守，历经婚姻、离别、等待与重逢，穷尽了爱情的所有可能性，被誉为“人类有史以来最伟大的爱情小说”。', '2015-09-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s29434013.jpg', null, null, '2026-03-13 01:23:02'), ('97', '9787532767607', '追风筝的人', '卡勒德·胡赛尼', '[\"文学\"]', '《追风筝的人》是胡赛尼的处女作，也是其最具影响力的作品。小说以阿富汗的历史变迁为背景，讲述了富家少爷阿米尔与仆人哈桑之间的友情、背叛与救赎。“为你，千千万万遍”的经典台词，道尽了人性的复杂与救赎的力量，展现了战争与人性的交织。', '2014-07-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s1013342.jpg', null, null, '2026-03-13 01:23:02'), ('98', '9787544258094', '活着', '余华', '[\"文学\"]', '《活着》是余华的代表作，讲述了福贵一生的坎坷命运。从富家少爷到贫农，福贵经历了父母、妻儿、女婿、外孙相继离世的苦难，却依然顽强地活着。小说以朴素的语言，展现了生命的韧性与重量，揭示了“人是为了活着本身而活着，不是为了活着之外的任何事物而活着”。', '2012-08-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s1046547.jpg', '', '', '2026-03-13 01:23:02'), ('99', '97875063654377', '许三观卖血记', '余华', '[\"文学\"]', '《许三观卖血记》是余华的经典长篇小说。讲述了许三观为了养家糊口，一次次卖血的故事，从青年到老年，卖血贯穿了他的一生，也见证了时代的变迁与家庭的温情。小说以幽默又心酸的笔触，展现了底层小人物的生存智慧与人间真情。', '2012-09-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s28358839.jpg', null, null, '2026-03-13 01:23:02'), ('101', '9787020002214', '三国演义', '罗贯中', '[\"文学\", \"历史\"]', '《三国演义》是中国古典四大名著之一，元末明初罗贯中所著。小说以三国时期的历史为蓝本，讲述了从东汉末年群雄逐鹿到三国鼎立再到晋朝统一的全过程，塑造了曹操、刘备、诸葛亮、关羽等经典人物形象，展现了波澜壮阔的战争与政治博弈。', '2008-06-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s27683767.jpg', null, null, '2026-03-13 01:23:02'), ('102', '9787020002221', '水浒传', '施耐庵', '[\"文学\", \"历史\"]', '《水浒传》是中国古典四大名著之一，元末明初施耐庵所著。小说讲述了以宋江为首的一百单八将被逼上梁山，聚义反抗朝廷，最终被招安后走向覆灭的故事，塑造了鲁智深、林冲、武松、李逵等鲜活的英雄形象，反映了宋代底层民众的反抗精神。', '2008-06-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s27683766.jpg', null, null, '2026-03-13 01:23:02'), ('103', '9787020002238', '西游记', '吴承恩', '[\"文学\", \"奇幻\"]', '《西游记》是中国古典四大名著之一，明代吴承恩所著。小说讲述了唐僧师徒四人西天取经，历经九九八十一难的故事，塑造了孙悟空、猪八戒、沙僧等经典形象，融合了神话、宗教与现实，既充满奇幻色彩，又暗含对人性与社会的思考。', '2008-06-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s27683765.jpg', null, null, '2026-03-13 01:23:02'), ('104', '9787532767720', '小王子', '安托万·德·圣-埃克苏佩里', '[\"文学\", \"儿童文学\"]', '《小王子》是法国作家圣-埃克苏佩里的经典童话，也是写给成年人的寓言。小说讲述了小王子离开自己的星球，游历各个星球，最终来到地球的故事，通过与狐狸、玫瑰、飞行员等的相遇，探讨了爱、孤独、责任与成长的真谛。', '2014-08-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s1008227.jpg', null, null, '2026-03-13 01:23:02');
INSERT INTO `books` (`book_id`, `isbn`, `title`, `author`, `genres`, `introduction`, `publish_date`, `total_copies`, `available_copies`, `cover_url`, `douban_link`, `video_link`, `created_at`) VALUES ('105', '9787532752096', '傲慢与偏见', '简·奥斯汀', '[\"文学\"]', '《傲慢与偏见》是简·奥斯汀的代表作。小说围绕班纳特家五位女儿的婚姻与爱情展开，重点讲述了伊丽莎白·班纳特与达西先生的故事，两人因傲慢与偏见产生误解，最终破除隔阂走到一起。作品以幽默的笔触，批判了当时英国社会以金钱和地位为基础的婚姻观。', '2010-07-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s4467728.jpg', null, null, '2026-03-13 01:23:02'), ('106', '9787532752102', '简·爱', '夏洛蒂·勃朗特', '[\"文学\"]', '《简·爱》是夏洛蒂·勃朗特的经典之作。小说讲述了孤女简·爱的成长历程，她从小受尽磨难，却始终保持独立、自尊与坚强，在与罗切斯特的爱情中，她追求平等与真挚的情感，最终收获了属于自己的幸福。作品塑造了一个独立自强的女性形象。', '2010-07-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4467729.jpg', null, null, '2026-03-13 01:23:02'), ('107', '9787532744395', '飘', '玛格丽特·米切尔', '[\"文学\", \"历史\"]', '《飘》（又名《乱世佳人》）是玛格丽特·米切尔唯一的长篇小说。以美国南北战争为背景，讲述了农场主女儿斯嘉丽的人生故事，她从娇纵的千金小姐成长为坚韧的女性，在爱情与战争的洪流中挣扎、成长，展现了南方社会的变迁与人性的复杂。', '2010-09-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s4467730.jpg', null, null, '2026-03-13 01:23:02'), ('108', '9787532744401', '麦田里的守望者', '杰罗姆·大卫·塞林格', '[\"文学\"]', '《麦田里的守望者》是塞林格的代表作，也是美国青春文学的经典。小说以第一人称讲述了16岁的霍尔顿·考尔菲尔德被学校开除后，在纽约游荡的三天经历，展现了青少年的叛逆、孤独与迷茫，探讨了成长与身份认同的问题。', '2010-09-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4467731.jpg', null, null, '2026-03-13 01:23:02'), ('109', '9787532744418', '了不起的盖茨比', '弗朗西斯·斯科特·基·菲茨杰拉德', '[\"文学\"]', '《了不起的盖茨比》是菲茨杰拉德的巅峰之作。小说以20世纪20年代的美国为背景，讲述了穷小子盖茨比通过非法手段积累财富，只为追回昔日恋人黛西，最终却悲剧收场的故事。作品批判了“美国梦”的虚幻，展现了爵士时代的浮华与空虚。', '2010-09-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s4467732.jpg', null, null, '2026-03-13 01:23:02'), ('110', '9787532744425', '变形记', '弗兰茨·卡夫卡', '[\"文学\", \"荒诞\"]', '《变形记》是卡夫卡的经典短篇小说。讲述了推销员格里高尔一觉醒来变成了一只甲虫，从此被家人嫌弃、抛弃，最终孤独死去的故事。作品以荒诞的情节，揭示了现代社会中人与人之间的冷漠、异化与个体的孤独。', '2010-09-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4467733.jpg', null, null, '2026-03-13 01:23:02'), ('111', '9787532744432', '百年酒馆', '路易·C·K', '[\"文学\", \"生活\"]', '《百年酒馆》是一部充满黑色幽默的短篇小说集，以一家百年酒馆为载体，讲述了形形色色的小人物的故事。他们在酒馆里倾诉烦恼、宣泄情绪，展现了普通人的无奈、挣扎与温暖，文字辛辣又治愈，直击人性的本质。', '2018-05-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s29771730.jpg', null, null, '2026-03-13 01:23:02'), ('112', '9787532744449', '月亮与六便士', '毛姆', '[\"文学\"]', '《月亮与六便士》是毛姆的经典长篇小说，以画家高更为原型。讲述了银行家查尔斯·思特里克兰德抛弃家庭与事业，远赴塔希提岛追求艺术理想的故事。“月亮”象征理想与艺术，“六便士”代表现实与物质，作品探讨了理想与现实的冲突。', '2010-09-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4467734.jpg', null, null, '2026-03-13 01:23:02'), ('113', '9787532744456', '茶花女', '小仲马', '[\"文学\"]', '《茶花女》是小仲马的代表作，也是法国浪漫主义文学的经典。小说讲述了巴黎名妓玛格丽特与阿尔芒的爱情悲剧，玛格丽特为了阿尔芒的前途选择离开，最终在孤独与病痛中死去。作品揭露了资产阶级的虚伪，歌颂了真挚的爱情。', '2010-09-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s4467735.jpg', null, null, '2026-03-13 01:23:02'), ('114', '9787532744463', '哈姆雷特', '威廉·莎士比亚', '[\"文学\", \"戏剧\"]', '《哈姆雷特》是莎士比亚的四大悲剧之首。讲述了丹麦王子哈姆雷特为父报仇的故事，他在复仇过程中陷入犹豫与思考，探讨了生存与死亡、正义与复仇、人性与道德等终极问题，语言优美，思想深刻，是西方文学的巅峰之作。', '2010-09-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4467736.jpg', null, null, '2026-03-13 01:23:02'), ('115', '9787532744470', '威尼斯商人', '威廉·莎士比亚', '[\"文学\", \"戏剧\"]', '《威尼斯商人》是莎士比亚的经典喜剧。围绕安东尼奥、夏洛克、鲍西娅等人物展开，既有对贪婪、偏见的批判，也有对善良、智慧的歌颂，夏洛克的“一磅肉”情节成为经典，作品兼具喜剧的幽默与对社会现实的反思。', '2010-09-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4467737.jpg', null, null, '2026-03-13 01:23:02'), ('116', '9787532744487', '童年·在人间·我的大学', '马克西姆·高尔基', '[\"文学\", \"自传\"]', '《童年·在人间·我的大学》是高尔基的自传体三部曲。讲述了阿廖沙从童年到青年的成长历程，他在苦难的生活中不断学习、思考，最终走上革命道路，展现了19世纪俄国社会的底层生活与青年的觉醒。', '2010-09-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s4467738.jpg', null, null, '2026-03-13 01:23:02'), ('117', '9787532744494', '钢铁是怎样炼成的', '尼古拉·奥斯特洛夫斯基', '[\"文学\", \"励志\"]', '《钢铁是怎样炼成的》是奥斯特洛夫斯基的自传体小说。讲述了保尔·柯察金从一个普通青年成长为无产阶级革命战士的故事，他在战争与建设中历经磨难，却始终坚守信仰，“人的一生应当这样度过”的经典名句激励了无数读者。', '2010-09-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s4467739.jpg', null, null, '2026-03-13 01:23:02'), ('118', '9787532744500', '飘', '玛格丽特·米切尔', '[\"文学\", \"历史\"]', '《飘》（又名《乱世佳人》）是玛格丽特·米切尔唯一的长篇小说。以美国南北战争为背景，讲述了农场主女儿斯嘉丽的人生故事，她从娇纵的千金小姐成长为坚韧的女性，在爱情与战争的洪流中挣扎、成长，展现了南方社会的变迁与人性的复杂。', '2010-09-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4467740.jpg', null, null, '2026-03-13 01:23:02'), ('119', '9787532744517', '鲁宾逊漂流记', '丹尼尔·笛福', '[\"文学\", \"冒险\"]', '《鲁宾逊漂流记》是笛福的代表作，也是英国现实主义小说的开山之作。讲述了鲁宾逊因海难流落荒岛，凭借自己的智慧与双手，在荒岛上生存28年的故事，展现了人类的生存能力与开拓精神，是冒险文学的经典。', '2010-09-01', '1', '0', 'https://img2.doubanio.com/view/subject/s/public/s4467741.jpg', null, null, '2026-03-13 01:23:02'), ('120', '9787532744524', '格列佛游记', '乔纳森·斯威夫特', '[\"文学\", \"讽刺\", \"奇幻\"]', '《格列佛游记》是斯威夫特的经典讽刺小说。讲述了格列佛先后游历小人国、大人国、飞岛国、慧骃国的奇遇，以奇幻的情节讽刺了当时英国的社会制度、政治腐败与人性的丑陋，兼具想象力与思想性。', '2010-09-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s4467742.jpg', null, null, '2026-03-13 01:23:02'), ('121', '9787532744531', '堂吉诃德', '米格尔·德·塞万提斯·萨阿维德拉', '[\"文学\", \"讽刺\"]', '《堂吉诃德》是塞万提斯的代表作，被誉为“现代小说之父”。讲述了乡绅堂吉诃德沉迷于骑士小说，自封“骑士”，带着仆人桑丘四处冒险的故事，以荒诞的情节讽刺了骑士文学的迂腐，也探讨了理想与现实的冲突。', '2010-09-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s4467743.jpg', null, null, '2026-03-13 01:23:02'), ('122', '9787532744548', '神曲', '但丁·阿利吉耶里', '[\"文学\", \"宗教\"]', '《神曲》是但丁的史诗巨著，分为《地狱》《炼狱》《天堂》三部分。讲述了但丁在维吉尔和贝阿特丽切的引导下，游历地狱、炼狱、天堂的过程，以象征的手法展现了中世纪的宗教、哲学与社会图景，是西方文学的里程碑。', '2010-09-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4467744.jpg', null, null, '2026-03-13 01:23:02'), ('123', '9787532744555', '浮士德', '约翰·沃尔夫冈·冯·歌德', '[\"文学\", \"哲学\"]', '《浮士德》是歌德耗时60年创作的诗剧，是德国文学的巅峰之作。讲述了浮士德博士与魔鬼梅菲斯特打赌，以灵魂换取世间的体验，历经爱情、政治、艺术、事业等阶段，最终灵魂得到救赎的故事，探讨了人性的追求与终极价值。', '2010-09-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4467745.jpg', null, null, '2026-03-13 01:23:02'), ('124', '9787532744562', '麦田里的守望者', '杰罗姆·大卫·塞林格', '[\"文学\"]', '《麦田里的守望者》是塞林格的代表作，也是美国青春文学的经典。小说以第一人称讲述了16岁的霍尔顿·考尔菲尔德被学校开除后，在纽约游荡的三天经历，展现了青少年的叛逆、孤独与迷茫，探讨了成长与身份认同的问题。', '2010-09-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s4467746.jpg', null, null, '2026-03-13 01:23:02'), ('125', '9787532744579', '追忆似水年华', '马塞尔·普鲁斯特', '[\"文学\", \"意识流\"]', '《追忆似水年华》是普鲁斯特的意识流小说巅峰之作。以主人公的回忆为主线，通过对日常生活的细腻描摹，展现了时间、记忆、爱情与艺术的本质，语言优美，思想深邃，是20世纪文学的经典。', '2010-09-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s4467747.jpg', null, null, '2026-03-13 01:23:02'), ('126', '9787532744586', '尤利西斯', '詹姆斯·乔伊斯', '[\"文学\", \"意识流\"]', '《尤利西斯》是乔伊斯的意识流经典，被誉为“20世纪最伟大的小说”。以一天的时间为跨度，讲述了利奥波德·布卢姆、斯蒂芬·迪达勒斯等人物的日常，模仿《奥德赛》的结构，展现了现代都市人的精神状态。', '2010-09-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4467748.jpg', null, null, '2026-03-13 01:23:02'), ('127', '9787532744593', '喧哗与骚动', '威廉·福克纳', '[\"文学\", \"意识流\"]', '《喧哗与骚动》是福克纳的代表作。以康普生家族的衰落为背景，通过不同人物的视角讲述故事，展现了南方贵族的没落与人性的扭曲，是意识流小说的经典之作。', '2010-09-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4467749.jpg', null, null, '2026-03-13 01:23:02'), ('128', '9787532744609', '百年孤独', '加西亚·马尔克斯', '[\"文学\"]', '《百年孤独》是魔幻现实主义文学的巅峰之作，为马尔克斯赢得诺贝尔文学奖。小说讲述了布恩迪亚家族七代人的传奇故事，以及马孔多小镇从兴起、繁荣到消亡的全过程，融合了神话、传说、宗教典故与现实，展现了拉丁美洲一个世纪以来风云变幻的历史。', '2011-06-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s4467750.jpg', null, null, '2026-03-13 01:23:02'), ('129', '9787532744616', '平凡的世界', '路遥', '[\"文学\", \"励志\"]', '《平凡的世界》是路遥的代表作，获茅盾文学奖。小说以70年代到80年代的中国农村为背景，讲述了孙少安、孙少平兄弟的成长与奋斗，展现了普通人在大时代历史进程中所走过的艰难曲折的道路，充满了对生活的热爱与对奋斗的歌颂。', '2012-08-01', '1', '1', 'https://img9.doubanio.com/view/subject/s/public/s28358840.jpg', null, null, '2026-03-13 01:23:02'), ('130', '9787532744623', '围城', '钱钟书', '[\"文学\", \"讽刺\"]', '《围城》是钱钟书的经典长篇小说。讲述了方鸿渐的人生经历，从留学回国到求职、结婚，他始终处于“围城”之中，“城外的人想进去，城里的人想出来”成为经典名句。作品以幽默的笔触，讽刺了知识分子的懦弱、虚伪与人生的困境。', '2010-09-01', '1', '1', 'https://img1.doubanio.com/view/subject/s/public/s4467751.jpg', null, null, '2026-03-13 01:23:02'), ('131', '9787532744630', '骆驼祥子', '老舍', '[\"文学\"]', '《骆驼祥子》是老舍的代表作。讲述了北平车夫祥子从勤劳、淳朴的青年，在黑暗的社会中历经三起三落，最终沦为行尸走肉的故事，揭露了旧中国底层劳动人民的悲惨命运，批判了社会的不公。', '2010-09-01', '1', '1', 'https://img2.doubanio.com/view/subject/s/public/s4467752.jpg', null, null, '2026-03-13 01:23:02'), ('132', '9787532744647', '茶馆', '老舍', '[\"文学\", \"戏剧\"]', '《茶馆》是老舍的经典话剧。以裕泰茶馆的兴衰为线索，展现了从清末到民国末年的社会变迁，通过茶馆里形形色色的人物，反映了旧中国的黑暗与人民的苦难，是中国现代话剧的巅峰之作。', '2010-09-01', '1', '1', 'https://img3.doubanio.com/view/subject/s/public/s4467753.jpg', null, null, '2026-03-13 01:23:02');
COMMIT;

-- ----------------------------
-- Table structure for borrow_records
-- ----------------------------
DROP TABLE IF EXISTS `borrow_records`;
CREATE TABLE `borrow_records` (
`record_id`  int NOT NULL AUTO_INCREMENT ,
`user_id`  int NOT NULL ,
`book_id`  int NOT NULL ,
`borrow_time`  datetime NOT NULL ,
`due_time`  datetime NOT NULL ,
`return_time`  datetime NULL DEFAULT NULL ,
`renewal_count`  int NULL DEFAULT 0 ,
`status`  enum('borrowed','returned','overdue','lost') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'borrowed' ,
`review`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT '用户读后感' ,
PRIMARY KEY (`record_id`),
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `idx_user_id` (`user_id`) USING BTREE ,
INDEX `idx_book_id` (`book_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=82

;

-- ----------------------------
-- Records of borrow_records
-- ----------------------------
BEGIN;
INSERT INTO `borrow_records` (`record_id`, `user_id`, `book_id`, `borrow_time`, `due_time`, `return_time`, `renewal_count`, `status`, `review`) VALUES ('1', '1', '1', '2024-01-10 10:00:00', '2024-02-09 10:00:00', '2024-01-25 14:30:00', '0', 'returned', null), ('2', '2', '2', '2024-01-15 14:00:00', '2024-02-14 14:00:00', '2024-02-10 11:00:00', '0', 'returned', null), ('3', '3', '3', '2024-01-20 09:30:00', '2024-02-19 09:30:00', '2024-02-15 16:20:00', '1', 'returned', null), ('4', '4', '4', '2024-02-01 11:00:00', '2024-03-02 11:00:00', '2024-02-28 10:00:00', '0', 'returned', null), ('5', '5', '5', '2024-02-05 13:45:00', '2024-03-06 13:45:00', '2024-03-01 09:15:00', '0', 'returned', null), ('6', '6', '6', '2024-02-10 15:30:00', '2024-03-11 15:30:00', '2024-03-05 14:00:00', '0', 'returned', null), ('7', '7', '7', '2024-02-15 10:20:00', '2024-03-16 10:20:00', '2024-03-10 11:30:00', '1', 'returned', null), ('8', '8', '8', '2024-02-20 14:10:00', '2024-03-21 14:10:00', '2024-03-15 13:40:00', '0', 'returned', null), ('9', '9', '9', '2024-03-01 09:00:00', '2024-03-31 09:00:00', '2024-03-20 16:00:00', '0', 'returned', null), ('10', '10', '10', '2024-03-05 11:30:00', '2024-04-04 11:30:00', '2024-03-25 10:20:00', '0', 'returned', null), ('11', '11', '11', '2024-03-10 13:15:00', '2024-04-09 13:15:00', '2024-04-01 12:00:00', '0', 'returned', null), ('12', '12', '12', '2024-03-15 15:45:00', '2024-04-14 15:45:00', '2024-04-05 14:30:00', '1', 'returned', null), ('13', '13', '13', '2024-03-20 10:00:00', '2024-04-19 10:00:00', '2024-04-10 09:45:00', '0', 'returned', null), ('14', '14', '14', '2024-03-25 14:20:00', '2024-04-24 14:20:00', '2024-04-15 13:10:00', '0', 'returned', null), ('15', '15', '15', '2024-04-01 09:30:00', '2024-05-01 09:30:00', '2024-04-20 16:15:00', '0', 'returned', null), ('16', '16', '16', '2024-04-05 11:00:00', '2024-05-05 11:00:00', '2024-04-25 10:30:00', '0', 'returned', null), ('17', '17', '17', '2024-04-10 13:40:00', '2024-05-10 13:40:00', '2024-04-30 12:20:00', '1', 'returned', null), ('18', '18', '18', '2024-04-15 15:10:00', '2024-05-15 15:10:00', '2024-05-05 14:00:00', '0', 'returned', null), ('19', '19', '19', '2024-04-20 10:45:00', '2024-05-20 10:45:00', '2024-05-10 09:30:00', '0', 'returned', null), ('20', '20', '20', '2024-04-25 14:00:00', '2024-05-25 14:00:00', '2024-05-15 13:00:00', '0', 'returned', null), ('21', '1', '21', '2026-01-03 00:40:08', '2026-02-02 00:40:08', null, '0', 'borrowed', null), ('22', '2', '22', '2025-12-29 00:40:08', '2026-01-28 00:40:08', null, '0', 'borrowed', null), ('23', '3', '23', '2025-12-24 00:40:08', '2026-01-23 00:40:08', null, '1', 'borrowed', null), ('24', '4', '24', '2026-01-08 00:40:08', '2026-02-07 00:40:08', null, '0', 'borrowed', null), ('25', '5', '25', '2026-01-01 00:40:08', '2026-01-31 00:40:08', null, '0', 'borrowed', null), ('26', '6', '26', '2025-12-26 00:40:08', '2026-01-25 00:40:08', null, '0', 'borrowed', null), ('27', '7', '27', '2026-01-05 00:40:08', '2026-02-04 00:40:08', null, '0', 'borrowed', null), ('28', '8', '28', '2025-12-22 00:40:08', '2026-01-21 00:40:08', null, '1', 'borrowed', null), ('29', '9', '29', '2026-01-10 00:40:08', '2026-02-09 00:40:08', null, '0', 'borrowed', null), ('30', '10', '30', '2025-12-19 00:40:08', '2026-01-18 00:40:08', null, '0', 'borrowed', null), ('31', '11', '31', '2026-01-06 00:40:08', '2026-02-05 00:40:08', null, '0', 'borrowed', null), ('32', '12', '32', '2025-12-30 00:40:08', '2026-01-29 00:40:08', null, '0', 'borrowed', null), ('33', '13', '33', '2025-12-23 00:40:08', '2026-01-22 00:40:08', null, '1', 'borrowed', null), ('34', '14', '34', '2026-01-07 00:40:08', '2026-02-06 00:40:08', null, '0', 'borrowed', null), ('35', '15', '35', '2025-12-31 00:40:08', '2026-01-30 00:40:08', null, '0', 'borrowed', null), ('36', '16', '36', '2025-12-25 00:40:08', '2026-01-24 00:40:08', null, '0', 'borrowed', null), ('37', '17', '37', '2026-01-09 00:40:08', '2026-02-08 00:40:08', null, '0', 'borrowed', null), ('38', '18', '38', '2025-12-21 00:40:08', '2026-01-20 00:40:08', null, '1', 'borrowed', null), ('39', '19', '39', '2026-01-11 00:40:08', '2026-02-10 00:40:08', null, '0', 'borrowed', null), ('40', '20', '40', '2025-12-27 00:40:08', '2026-01-26 00:40:08', null, '0', 'borrowed', null), ('41', '1', '1', '2025-12-04 00:40:08', '2026-01-03 00:40:08', null, '0', 'overdue', null), ('42', '2', '2', '2025-11-29 00:40:08', '2025-12-29 00:40:08', null, '0', 'overdue', null), ('43', '3', '3', '2025-11-24 00:40:08', '2025-12-24 00:40:08', null, '1', 'overdue', null), ('44', '4', '4', '2025-12-09 00:40:08', '2026-01-08 00:40:08', null, '0', 'overdue', null), ('45', '5', '5', '2025-12-02 00:40:08', '2026-01-01 00:40:08', null, '0', 'overdue', null), ('46', '6', '6', '2025-11-26 00:40:08', '2025-12-26 00:40:08', null, '0', 'overdue', null), ('47', '7', '7', '2025-12-06 00:40:08', '2026-01-05 00:40:08', null, '0', 'overdue', null), ('48', '8', '8', '2025-11-22 00:40:08', '2025-12-22 00:40:08', null, '1', 'overdue', null), ('49', '9', '9', '2025-12-11 00:40:08', '2026-01-10 00:40:08', null, '0', 'overdue', null), ('50', '10', '10', '2025-11-19 00:40:08', '2025-12-19 00:40:08', null, '0', 'overdue', null), ('51', '11', '11', '2025-12-07 00:40:08', '2026-01-06 00:40:08', null, '0', 'overdue', null), ('52', '12', '12', '2025-11-30 00:40:08', '2025-12-30 00:40:08', null, '0', 'overdue', null), ('53', '13', '13', '2025-11-23 00:40:08', '2025-12-23 00:40:08', null, '1', 'overdue', null), ('54', '14', '14', '2025-12-08 00:40:08', '2026-01-07 00:40:08', null, '0', 'overdue', null), ('55', '15', '15', '2025-12-01 00:40:08', '2025-12-31 00:40:08', null, '0', 'overdue', null), ('56', '16', '16', '2025-11-25 00:40:08', '2025-12-25 00:40:08', null, '0', 'overdue', null), ('57', '17', '17', '2025-12-10 00:40:08', '2026-01-09 00:40:08', null, '0', 'overdue', null), ('58', '18', '18', '2025-11-21 00:40:08', '2025-12-21 00:40:08', null, '1', 'overdue', null), ('59', '19', '19', '2025-12-12 00:40:08', '2026-01-11 00:40:08', null, '0', 'overdue', null), ('60', '20', '20', '2025-11-27 00:40:08', '2025-12-27 00:40:08', null, '0', 'overdue', null), ('61', '1', '1', '2026-01-13 11:21:42', '2026-02-12 11:21:42', null, '0', 'borrowed', null), ('62', '1', '3', '2026-01-13 11:22:28', '2026-02-12 11:22:28', null, '0', 'borrowed', null), ('63', '31', '5', '2026-01-26 13:44:04', '2026-02-25 13:44:04', '2026-03-13 23:04:43', '0', 'returned', null), ('64', '31', '9', '2026-01-26 15:07:36', '2026-02-25 15:07:36', '2026-01-26 22:04:42', '0', 'returned', null), ('65', '31', '8', '2026-01-26 20:31:36', '2026-02-25 20:31:36', '2026-01-26 22:04:38', '0', 'returned', null), ('66', '31', '5', '2026-01-26 22:16:08', '2026-02-25 22:16:08', '2026-01-26 22:22:55', '0', 'returned', null), ('67', '31', '8', '2026-01-26 22:16:10', '2026-02-25 22:16:10', '2026-01-26 22:22:52', '0', 'returned', null), ('68', '31', '12', '2026-01-26 22:22:30', '2026-02-25 22:22:30', '2026-01-26 22:22:49', '0', 'returned', 'very good'), ('69', '31', '16', '2026-03-12 23:17:16', '2026-04-11 23:17:16', null, '0', 'borrowed', null), ('70', '31', '17', '2026-03-12 23:17:19', '2026-04-11 23:17:19', '2026-03-13 23:04:48', '0', 'returned', null), ('71', '31', '21', '2026-03-12 23:17:23', '2026-05-11 23:17:23', null, '0', 'borrowed', '太好了'), ('72', '31', '22', '2026-03-12 23:17:24', '2026-04-11 23:17:24', '2026-03-13 23:04:57', '0', 'returned', null), ('73', '31', '23', '2026-03-12 23:17:25', '2026-04-11 23:17:25', '2026-03-12 23:18:20', '0', 'returned', null), ('74', '31', '25', '2026-03-12 23:17:26', '2026-04-11 23:17:26', '2026-03-12 23:18:17', '0', 'returned', null), ('75', '31', '26', '2026-03-12 23:17:27', '2026-04-11 23:17:27', '2026-03-12 23:18:09', '0', 'returned', null), ('76', '31', '27', '2026-03-12 23:17:27', '2026-04-11 23:17:27', '2026-03-12 23:18:14', '0', 'returned', null), ('77', '31', '22', '2026-03-12 23:17:38', '2026-04-11 23:17:38', '2026-03-12 23:18:05', '0', 'returned', null), ('78', '31', '25', '2026-03-13 23:03:50', '2026-04-12 23:03:50', null, '0', 'lost', '好书，读完感觉自己对于局势掌控有了进一步的提升\n'), ('79', '31', '5', '2026-03-18 06:09:43', '2026-04-17 06:09:43', null, '0', 'borrowed', null), ('80', '31', '119', '2026-03-18 11:50:53', '2026-04-17 11:50:53', null, '0', 'borrowed', null), ('81', '31', '23', '2026-03-18 11:51:12', '2026-04-17 11:51:12', null, '0', 'borrowed', null), ('82', '32', '22', '2026-03-22 02:05:25', '2026-04-21 02:05:25', null, '0', 'borrowed', null);
COMMIT;

-- ----------------------------
-- Table structure for borrow_requests
-- ----------------------------
DROP TABLE IF EXISTS `borrow_requests`;
CREATE TABLE `borrow_requests` (
`request_id`  int NOT NULL AUTO_INCREMENT ,
`user_id`  int NOT NULL ,
`book_id`  int NOT NULL ,
`request_type`  enum('borrow','return','renew','lost') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`record_id`  int NULL DEFAULT NULL COMMENT '关联的借阅记录ID，还书申请时使用' ,
`status`  enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'pending' ,
`request_time`  datetime NULL DEFAULT CURRENT_TIMESTAMP ,
`approved_by`  int NULL DEFAULT NULL COMMENT '审核管理员ID' ,
`approved_at`  datetime NULL DEFAULT NULL ,
`reject_reason`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`pickup_time`  datetime NULL DEFAULT NULL COMMENT '取书/还书时间' ,
`admin_message`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT '审核通过后的通知消息' ,
PRIMARY KEY (`request_id`),
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `book_id` (`book_id`) USING BTREE ,
INDEX `idx_user_status` (`user_id`, `status`) USING BTREE ,
INDEX `idx_status` (`status`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=11

;

-- ----------------------------
-- Records of borrow_requests
-- ----------------------------
BEGIN;
INSERT INTO `borrow_requests` (`request_id`, `user_id`, `book_id`, `request_type`, `record_id`, `status`, `request_time`, `approved_by`, `approved_at`, `reject_reason`, `pickup_time`, `admin_message`) VALUES ('1', '31', '25', 'return', '78', 'rejected', '2026-03-13 15:30:55', '32', '2026-03-18 06:09:55', '异常', null, null), ('2', '31', '5', 'borrow', '79', 'approved', '2026-03-13 15:32:26', '32', '2026-03-18 06:09:43', null, null, ''), ('3', '31', '25', 'renew', '78', 'rejected', '2026-03-13 17:08:20', '32', '2026-03-18 06:09:36', '不给', '2026-04-19 23:03:50', null), ('4', '31', '25', 'lost', '78', 'approved', '2026-03-13 17:08:29', '32', '2026-03-17 07:45:58', '1234567', null, '挂失已处理，请联系图书馆了解赔偿事宜'), ('9', '31', '23', 'borrow', '81', 'approved', '2026-03-18 08:26:02', '32', '2026-03-18 11:51:12', null, null, ''), ('10', '31', '119', 'borrow', '80', 'approved', '2026-03-18 11:48:44', '32', '2026-03-18 11:50:53', null, null, '');
COMMIT;

-- ----------------------------
-- Table structure for browse_history
-- ----------------------------
DROP TABLE IF EXISTS `browse_history`;
CREATE TABLE `browse_history` (
`history_id`  int NOT NULL AUTO_INCREMENT ,
`user_id`  int NOT NULL ,
`book_id`  int NOT NULL ,
`browse_time`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
PRIMARY KEY (`history_id`),
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `user_id` (`user_id`) USING BTREE ,
INDEX `book_id` (`book_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=86

;

-- ----------------------------
-- Records of browse_history
-- ----------------------------
BEGIN;
INSERT INTO `browse_history` (`history_id`, `user_id`, `book_id`, `browse_time`) VALUES ('1', '1', '1', '2026-01-12 14:40:49'), ('2', '1', '2', '2026-01-12 15:40:49'), ('3', '1', '3', '2026-01-12 16:40:49'), ('4', '1', '4', '2026-01-12 17:40:49'), ('5', '1', '5', '2026-01-12 18:40:49'), ('6', '1', '6', '2026-01-12 19:40:49'), ('7', '1', '7', '2026-01-12 20:40:49'), ('8', '1', '8', '2026-01-12 21:40:49'), ('9', '1', '9', '2026-01-12 22:40:49'), ('10', '1', '10', '2026-01-12 23:40:49'), ('11', '2', '11', '2026-01-12 04:40:49'), ('12', '2', '12', '2026-01-12 05:40:49'), ('13', '2', '13', '2026-01-12 06:40:49'), ('14', '2', '14', '2026-01-12 07:40:49'), ('15', '2', '15', '2026-01-12 08:40:49'), ('16', '2', '16', '2026-01-12 09:40:49'), ('17', '2', '17', '2026-01-12 10:40:49'), ('18', '2', '18', '2026-01-12 11:40:49'), ('19', '2', '19', '2026-01-12 12:40:49'), ('20', '2', '20', '2026-01-12 13:40:49'), ('21', '3', '21', '2026-01-11 18:40:49'), ('22', '3', '22', '2026-01-11 19:40:49'), ('23', '3', '23', '2026-01-11 20:40:49'), ('24', '3', '24', '2026-01-11 21:40:49'), ('25', '3', '25', '2026-01-11 22:40:49'), ('26', '3', '26', '2026-01-11 23:40:49'), ('27', '3', '27', '2026-01-12 00:40:49'), ('28', '3', '28', '2026-01-12 01:40:49'), ('29', '3', '29', '2026-01-12 02:40:49'), ('30', '3', '30', '2026-01-12 03:40:49'), ('31', '4', '31', '2026-01-11 08:40:49'), ('32', '4', '32', '2026-01-11 09:40:49'), ('33', '4', '33', '2026-01-11 10:40:49'), ('34', '4', '34', '2026-01-11 11:40:49'), ('35', '4', '35', '2026-01-11 12:40:49'), ('36', '4', '36', '2026-01-11 13:40:49'), ('37', '4', '37', '2026-01-11 14:40:49'), ('38', '4', '38', '2026-01-11 15:40:49'), ('39', '4', '39', '2026-01-11 16:40:49'), ('40', '4', '40', '2026-01-11 17:40:49'), ('41', '5', '1', '2026-01-10 22:40:49'), ('42', '5', '2', '2026-01-10 23:40:49'), ('43', '5', '3', '2026-01-11 00:40:49'), ('44', '5', '4', '2026-01-11 01:40:49'), ('45', '5', '5', '2026-01-11 02:40:49'), ('46', '5', '6', '2026-01-11 03:40:49'), ('47', '5', '7', '2026-01-11 04:40:49'), ('48', '5', '8', '2026-01-11 05:40:49'), ('49', '5', '9', '2026-01-11 06:40:49'), ('50', '5', '10', '2026-01-11 07:40:49'), ('51', '6', '11', '2026-01-10 12:40:49'), ('52', '6', '12', '2026-01-10 13:40:49'), ('53', '6', '13', '2026-01-10 14:40:49'), ('54', '6', '14', '2026-01-10 15:40:49'), ('55', '6', '15', '2026-01-10 16:40:49'), ('56', '7', '16', '2026-01-10 02:40:49'), ('57', '7', '17', '2026-01-10 03:40:49'), ('58', '7', '18', '2026-01-10 04:40:49'), ('59', '7', '19', '2026-01-10 05:40:49'), ('60', '7', '20', '2026-01-10 06:40:49'), ('61', '8', '21', '2026-01-09 16:40:49'), ('62', '8', '22', '2026-01-09 17:40:49'), ('63', '8', '23', '2026-01-09 18:40:49'), ('64', '8', '24', '2026-01-09 19:40:49'), ('65', '8', '25', '2026-01-09 20:40:49'), ('66', '9', '26', '2026-01-09 06:40:49'), ('67', '9', '27', '2026-01-09 07:40:49'), ('68', '9', '28', '2026-01-09 08:40:49'), ('69', '9', '29', '2026-01-09 09:40:49'), ('70', '9', '30', '2026-01-09 10:40:49'), ('71', '10', '31', '2026-01-08 20:40:49'), ('72', '10', '32', '2026-01-08 21:40:49'), ('73', '10', '33', '2026-01-08 22:40:49'), ('74', '10', '34', '2026-01-08 23:40:49'), ('75', '10', '35', '2026-01-09 00:40:49'), ('76', '11', '36', '2026-01-08 10:40:49'), ('77', '11', '37', '2026-01-08 11:40:49'), ('78', '12', '38', '2026-01-08 00:40:49'), ('79', '12', '39', '2026-01-08 01:40:49'), ('80', '13', '40', '2026-01-07 14:40:49'), ('81', '13', '1', '2026-01-07 15:40:49'), ('82', '14', '2', '2026-01-07 04:40:49'), ('83', '14', '3', '2026-01-07 05:40:49'), ('84', '15', '4', '2026-01-06 18:40:49'), ('85', '15', '5', '2026-01-06 19:40:49');
COMMIT;

-- ----------------------------
-- Table structure for extension_requests
-- ----------------------------
DROP TABLE IF EXISTS `extension_requests`;
CREATE TABLE `extension_requests` (
`request_id`  int NOT NULL AUTO_INCREMENT ,
`record_id`  int NOT NULL ,
`user_id`  int NOT NULL ,
`duration_days`  int NOT NULL COMMENT '申请延期天数' ,
`reason`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT '申请原因' ,
`status`  enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'pending' ,
`admin_note`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT '管理员备注' ,
`created_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
`processed_at`  timestamp NULL DEFAULT NULL ,
PRIMARY KEY (`request_id`),
FOREIGN KEY (`record_id`) REFERENCES `borrow_records` (`record_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `record_id` (`record_id`) USING BTREE ,
INDEX `user_id` (`user_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='延期申请表'
AUTO_INCREMENT=1

;

-- ----------------------------
-- Records of extension_requests
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for favorites
-- ----------------------------
DROP TABLE IF EXISTS `favorites`;
CREATE TABLE `favorites` (
`favorite_id`  int NOT NULL AUTO_INCREMENT ,
`user_id`  int NOT NULL ,
`book_id`  int NOT NULL ,
`created_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
PRIMARY KEY (`favorite_id`),
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `user_id` (`user_id`) USING BTREE ,
INDEX `book_id` (`book_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=84

;

-- ----------------------------
-- Records of favorites
-- ----------------------------
BEGIN;
INSERT INTO `favorites` (`favorite_id`, `user_id`, `book_id`, `created_at`) VALUES ('1', '1', '1', '2026-01-13 00:40:22'), ('3', '1', '10', '2026-01-13 00:40:22'), ('4', '1', '15', '2026-01-13 00:40:22'), ('5', '1', '20', '2026-01-13 00:40:22'), ('6', '2', '2', '2026-01-13 00:40:22'), ('7', '2', '7', '2026-01-13 00:40:22'), ('8', '2', '12', '2026-01-13 00:40:22'), ('9', '2', '17', '2026-01-13 00:40:22'), ('10', '2', '22', '2026-01-13 00:40:22'), ('11', '3', '3', '2026-01-13 00:40:22'), ('12', '3', '8', '2026-01-13 00:40:22'), ('13', '3', '13', '2026-01-13 00:40:22'), ('14', '3', '18', '2026-01-13 00:40:22'), ('15', '3', '23', '2026-01-13 00:40:22'), ('16', '4', '4', '2026-01-13 00:40:22'), ('17', '4', '9', '2026-01-13 00:40:22'), ('18', '4', '14', '2026-01-13 00:40:22'), ('19', '4', '19', '2026-01-13 00:40:22'), ('20', '4', '24', '2026-01-13 00:40:22'), ('21', '5', '5', '2026-01-13 00:40:22'), ('22', '5', '10', '2026-01-13 00:40:22'), ('23', '5', '15', '2026-01-13 00:40:22'), ('24', '5', '20', '2026-01-13 00:40:22'), ('25', '5', '25', '2026-01-13 00:40:22'), ('26', '6', '6', '2026-01-13 00:40:22'), ('27', '6', '11', '2026-01-13 00:40:22'), ('28', '6', '16', '2026-01-13 00:40:22'), ('29', '6', '21', '2026-01-13 00:40:22'), ('30', '6', '26', '2026-01-13 00:40:22'), ('31', '7', '7', '2026-01-13 00:40:22'), ('32', '7', '12', '2026-01-13 00:40:22'), ('33', '7', '17', '2026-01-13 00:40:22'), ('34', '7', '22', '2026-01-13 00:40:22'), ('35', '7', '27', '2026-01-13 00:40:22'), ('36', '8', '8', '2026-01-13 00:40:22'), ('37', '8', '13', '2026-01-13 00:40:22'), ('38', '8', '18', '2026-01-13 00:40:22'), ('39', '8', '23', '2026-01-13 00:40:22'), ('40', '8', '28', '2026-01-13 00:40:22'), ('41', '9', '9', '2026-01-13 00:40:22'), ('42', '9', '14', '2026-01-13 00:40:22'), ('43', '9', '19', '2026-01-13 00:40:22'), ('44', '9', '24', '2026-01-13 00:40:22'), ('45', '9', '29', '2026-01-13 00:40:22'), ('46', '10', '10', '2026-01-13 00:40:22'), ('47', '10', '15', '2026-01-13 00:40:22'), ('48', '10', '20', '2026-01-13 00:40:22'), ('49', '10', '25', '2026-01-13 00:40:22'), ('50', '10', '30', '2026-01-13 00:40:22'), ('75', '31', '1', '2026-01-27 00:59:43'), ('76', '31', '2', '2026-01-27 00:59:45'), ('77', '31', '4', '2026-01-27 00:59:46'), ('78', '31', '8', '2026-03-12 23:38:32'), ('79', '31', '12', '2026-03-12 23:38:33'), ('80', '31', '3', '2026-03-13 20:09:54'), ('81', '31', '25', '2026-03-13 23:03:53'), ('82', '31', '9', '2026-03-18 14:05:17'), ('83', '31', '98', '2026-03-18 19:49:04'), ('84', '32', '5', '2026-03-22 02:04:53');
COMMIT;

-- ----------------------------
-- Table structure for notifications
-- ----------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
`notification_id`  int NOT NULL AUTO_INCREMENT ,
`sender_id`  int NOT NULL ,
`receiver_id`  int NOT NULL ,
`title`  varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`content`  text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL ,
`type`  enum('system','due_reminder','reservation','news','activity') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'system' ,
`is_read`  tinyint(1) NULL DEFAULT 0 ,
`created_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
PRIMARY KEY (`notification_id`),
FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `sender_id` (`sender_id`) USING BTREE ,
INDEX `receiver_id` (`receiver_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=77

;

-- ----------------------------
-- Records of notifications
-- ----------------------------
BEGIN;
INSERT INTO `notifications` (`notification_id`, `sender_id`, `receiver_id`, `title`, `content`, `type`, `is_read`, `created_at`) VALUES ('1', '1', '1', '欢迎使用图书馆系统', '欢迎来到智慧图书馆，祝您阅读愉快！', 'system', '1', '2026-01-13 00:40:32'), ('2', '1', '2', '新书上架通知', '《Python编程：从入门到实践》已上架，欢迎借阅！', 'news', '1', '2026-01-13 00:40:32'), ('3', '1', '3', '借阅即将到期提醒', '您借阅的《活着》将于3天后到期，请及时归还或续借。', 'due_reminder', '0', '2026-01-13 00:40:32'), ('4', '1', '4', '预约成功通知', '您预约的《百年孤独》已有可借副本，请及时前往借阅。', 'reservation', '1', '2026-01-13 00:40:32'), ('5', '1', '5', '系统维护通知', '系统将于本周六凌晨2-4点进行维护，期间可能无法访问。', 'system', '0', '2026-01-13 00:40:32'), ('6', '1', '6', '活动通知', '本周六下午有读书分享会，欢迎参加！', 'news', '1', '2026-01-13 00:40:32'), ('7', '1', '7', '借阅即将到期提醒', '您借阅的《三体》将于5天后到期，请及时归还或续借。', 'due_reminder', '0', '2026-01-13 00:40:32'), ('8', '1', '8', '新书上架通知', '《算法导论》最新版已上架，欢迎借阅！', 'news', '1', '2026-01-13 00:40:32'), ('9', '1', '9', '系统更新通知', '图书馆系统已更新，新增推荐功能。', 'system', '1', '2026-01-13 00:40:32'), ('10', '1', '10', '逾期提醒', '您借阅的《围城》已逾期，请尽快归还。', 'due_reminder', '0', '2026-01-13 00:40:32'), ('11', '1', '11', '欢迎使用图书馆系统', '欢迎来到智慧图书馆，祝您阅读愉快！', 'system', '1', '2026-01-13 00:40:32'), ('12', '1', '12', '新书上架通知', '《深入理解计算机系统》已上架，欢迎借阅！', 'news', '1', '2026-01-13 00:40:32'), ('13', '1', '13', '借阅即将到期提醒', '您借阅的《追风筝的人》将于2天后到期，请及时归还或续借。', 'due_reminder', '0', '2026-01-13 00:40:32'), ('14', '1', '14', '预约成功通知', '您预约的《冰与火之歌》已有可借副本，请及时前往借阅。', 'reservation', '1', '2026-01-13 00:40:32'), ('15', '1', '15', '系统维护通知', '系统将于下周一凌晨1-3点进行维护，期间可能无法访问。', 'system', '0', '2026-01-13 00:40:32'), ('16', '1', '16', '活动通知', '下周三有编程讲座，欢迎参加！', 'news', '1', '2026-01-13 00:40:32'), ('17', '1', '17', '借阅即将到期提醒', '您借阅的《时间简史》将于4天后到期，请及时归还或续借。', 'due_reminder', '0', '2026-01-13 00:40:32'), ('18', '1', '18', '新书上架通知', '《人类简史》已上架，欢迎借阅！', 'news', '1', '2026-01-13 00:40:32'), ('19', '1', '19', '系统更新通知', '图书馆系统已更新，修复已知问题。', 'system', '1', '2026-01-13 00:40:32'), ('20', '1', '20', '逾期提醒', '您借阅的《资本论》已逾期，请尽快归还。', 'due_reminder', '0', '2026-01-13 00:40:32'), ('21', '2', '1', '好友推荐', '我最近读了《活着》，非常感动，推荐给你！', 'news', '1', '2026-01-13 00:40:32'), ('22', '3', '1', '读书分享', '我们正在组织《三体》读书会，邀请你参加。', 'news', '0', '2026-01-13 00:40:32'), ('23', '4', '2', '图书讨论', '关于《百年孤独》的讨论会将于周五举行。', 'news', '1', '2026-01-13 00:40:32'), ('24', '5', '3', '图书推荐', '《追风筝的人》这本书很不错，推荐给你。', 'news', '1', '2026-01-13 00:40:32'), ('25', '6', '4', '活动邀请', '周六有科幻小说分享会，邀请你参加。', 'news', '0', '2026-01-13 00:40:32'), ('26', '7', '5', '图书推荐', '如果你喜欢编程，强烈推荐《代码大全》。', 'news', '1', '2026-01-13 00:40:32'), ('27', '8', '6', '读书小组', '我们成立了一个历史书籍读书小组，欢迎加入。', 'news', '1', '2026-01-13 00:40:32'), ('28', '9', '7', '图书讨论', '关于《人类简史》的讨论，期待你的见解。', 'news', '0', '2026-01-13 00:40:32'), ('29', '10', '8', '推荐书籍', '《经济学原理》对理解经济很有帮助。', 'news', '1', '2026-01-13 00:40:32'), ('30', '11', '9', '活动通知', '本周日下午有哲学书籍分享会。', 'news', '1', '2026-01-13 00:40:32'), ('31', '12', '10', '好友推荐', '《心理学与生活》这本书很适合初学者。', 'news', '0', '2026-01-13 00:40:32'), ('32', '13', '11', '读书分享', '我们正在读《非暴力沟通》，欢迎加入讨论。', 'news', '1', '2026-01-13 00:40:32'), ('33', '14', '12', '图书推荐', '《刻意练习》对提高学习效率很有帮助。', 'news', '1', '2026-01-13 00:40:32'), ('34', '15', '13', '活动邀请', '下周三有自我成长书籍分享会。', 'news', '0', '2026-01-13 00:40:32'), ('35', '16', '14', '图书讨论', '关于《影响力》的讨论会将于周四举行。', 'news', '1', '2026-01-13 00:40:32'), ('36', '17', '15', '推荐书籍', '《少有人走的路》值得一读。', 'news', '1', '2026-01-13 00:40:32'), ('37', '18', '16', '读书小组', '我们成立了一个小说读书小组，欢迎加入。', 'news', '0', '2026-01-13 00:40:32'), ('38', '19', '17', '图书推荐', '如果你喜欢科幻，不要错过《沙丘》。', 'news', '1', '2026-01-13 00:40:32'), ('39', '20', '18', '活动通知', '周六有推理小说分享会。', 'news', '1', '2026-01-13 00:40:32'), ('40', '21', '19', '好友推荐', '《被讨厌的勇气》这本书改变了我很多。', 'news', '0', '2026-01-13 00:40:32'), ('42', '32', '2', '您有图书已逾期', '您好，您借阅的《三体》已于2025-12-29逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('43', '32', '3', '您有图书已逾期', '您好，您借阅的《追风筝的人》已于2025-12-24逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('44', '32', '6', '您有图书已逾期', '您好，您借阅的《红楼梦》已于2025-12-26逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('45', '32', '8', '您有图书已逾期', '您好，您借阅的《骆驼祥子》已于2025-12-22逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('46', '32', '10', '您有图书已逾期', '您好，您借阅的《白夜行》已于2025-12-19逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('47', '32', '12', '您有图书已逾期', '您好，您借阅的《流浪地球》已于2025-12-30逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('48', '32', '13', '您有图书已逾期', '您好，您借阅的《银河帝国：基地》已于2025-12-23逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('49', '32', '16', '您有图书已逾期', '您好，您借阅的《哈利·波特与密室》已于2025-12-25逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('50', '32', '18', '您有图书已逾期', '您好，您借阅的《指环王》已于2025-12-21逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('51', '32', '20', '您有图书已逾期', '您好，您借阅的《冰与火之歌》已于2025-12-27逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-17 08:03:40'), ('55', '32', '2', '您有图书已逾期', '您好，您借阅的《三体》已于2025-12-29逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('56', '32', '3', '您有图书已逾期', '您好，您借阅的《追风筝的人》已于2025-12-24逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('57', '32', '6', '您有图书已逾期', '您好，您借阅的《红楼梦》已于2025-12-26逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('58', '32', '8', '您有图书已逾期', '您好，您借阅的《骆驼祥子》已于2025-12-22逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('59', '32', '10', '您有图书已逾期', '您好，您借阅的《白夜行》已于2025-12-19逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('60', '32', '12', '您有图书已逾期', '您好，您借阅的《流浪地球》已于2025-12-30逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('61', '32', '13', '您有图书已逾期', '您好，您借阅的《银河帝国：基地》已于2025-12-23逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('62', '32', '16', '您有图书已逾期', '您好，您借阅的《哈利·波特与密室》已于2025-12-25逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('63', '32', '18', '您有图书已逾期', '您好，您借阅的《指环王》已于2025-12-21逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('64', '32', '20', '您有图书已逾期', '您好，您借阅的《冰与火之歌》已于2025-12-27逾期，请尽快归还并缴纳滞纳金。如有疑问请联系图书馆管理员。', 'system', '0', '2026-03-18 06:10:38'), ('65', '32', '2', '您预约的图书已可取', '您好，您预约的《三体》已有可借副本，请于7个工作日内前往图书馆取书。', 'system', '0', '2026-03-18 06:10:58'), ('68', '32', '2', '您预约的图书已可取', '您好，您预约的《三体》已有可借副本，请于7个工作日内前往图书馆取书。', 'system', '0', '2026-03-18 11:53:06'), ('69', '32', '9', '您预约的图书已可取', '您好，您预约的《挪威的森林》已有可借副本，请于7个工作日内前往图书馆取书。', 'system', '0', '2026-03-18 11:53:06'), ('70', '32', '10', '您预约的图书已可取', '您好，您预约的《白夜行》已有可借副本，请于7个工作日内前往图书馆取书。', 'system', '0', '2026-03-18 11:53:06'), ('77', '32', '32', '活动报名审核通过', '您报名的活动「1234567」已审核通过。活动时间：2026-03-14 19:52，地点：北京邮电大学。请准时参加！', 'activity', '1', '2026-03-21 17:41:05'), ('78', '32', '31', '活动报名审核通过', '您报名的活动「1234567」已审核通过。活动时间：2026-03-14 19:52，地点：北京邮电大学。请准时参加！', 'activity', '0', '2026-03-21 17:41:06'), ('79', '32', '32', '活动报名审核未通过', '您报名的活动「北京邮电大学参观」审核未通过。感谢您的关注，欢迎参与其他活动。', 'activity', '1', '2026-03-21 17:50:59'), ('80', '32', '31', '活动报名审核未通过', '您报名的活动「北京邮电大学参观」审核未通过。感谢您的关注，欢迎参与其他活动。', 'activity', '0', '2026-03-21 17:51:00');
COMMIT;

-- ----------------------------
-- Table structure for reservations
-- ----------------------------
DROP TABLE IF EXISTS `reservations`;
CREATE TABLE `reservations` (
`reservation_id`  int NOT NULL AUTO_INCREMENT ,
`user_id`  int NOT NULL ,
`book_id`  int NOT NULL ,
`reserved_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
`status`  enum('waiting','ready','cancelled','expired') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`expiry_date`  datetime NULL DEFAULT NULL ,
`notified`  tinyint(1) NULL DEFAULT 0 ,
PRIMARY KEY (`reservation_id`),
FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
FOREIGN KEY (`book_id`) REFERENCES `books` (`book_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
INDEX `user_id` (`user_id`) USING BTREE ,
INDEX `book_id` (`book_id`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=26

;

-- ----------------------------
-- Records of reservations
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
`user_id`  int NOT NULL AUTO_INCREMENT ,
`phone`  varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`password_hash`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL ,
`birthday`  date NULL DEFAULT NULL ,
`hobbies`  json NULL DEFAULT NULL ,
`school`  varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`avatar_url`  varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL ,
`created_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ,
`updated_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP ,
`status`  enum('active','suspended','deleted') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'active' ,
PRIMARY KEY (`user_id`),
UNIQUE INDEX `phone` (`phone`) USING BTREE 
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
AUTO_INCREMENT=34

;

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
INSERT INTO `users` (`user_id`, `phone`, `password_hash`, `birthday`, `hobbies`, `school`, `avatar_url`, `created_at`, `updated_at`) VALUES ('1', '13800138000', 'e10adc3949ba59abbe56e057f20f883e', '2000-01-15', '[\"阅读\", \"编程\", \"音乐\"]', '清华大学', 'https://randomuser.me/api/portraits/men/1.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('2', '13800138001', 'e10adc3949ba59abbe56e057f20f883e', '2001-03-22', '[\"篮球\", \"电影\", \"旅游\"]', '北京大学', 'https://randomuser.me/api/portraits/women/2.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('3', '13800138002', 'e10adc3949ba59abbe56e057f20f883e', '1999-05-10', '[\"摄影\", \"美食\", \"游戏\"]', '复旦大学', 'https://randomuser.me/api/portraits/men/3.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('4', '13800138003', 'e10adc3949ba59abbe56e057f20f883e', '2002-07-30', '[\"绘画\", \"舞蹈\", \"写作\"]', '上海交通大学', 'https://randomuser.me/api/portraits/women/4.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('5', '13800138004', 'e10adc3949ba59abbe56e057f20f883e', '1998-11-18', '[\"足球\", \"音乐\", \"编程\"]', '浙江大学', 'https://randomuser.me/api/portraits/men/5.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('6', '13800138005', 'e10adc3949ba59abbe56e057f20f883e', '2000-09-25', '[\"跑步\", \"阅读\", \"烹饪\"]', '南京大学', 'https://randomuser.me/api/portraits/women/6.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('7', '13800138006', 'e10adc3949ba59abbe56e057f20f883e', '2001-02-14', '[\"游泳\", \"电影\", \"摄影\"]', '武汉大学', 'https://randomuser.me/api/portraits/men/7.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('8', '13800138007', 'e10adc3949ba59abbe56e057f20f883e', '1999-12-05', '[\"登山\", \"书法\", \"棋类\"]', '华中科技大学', 'https://randomuser.me/api/portraits/women/8.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('9', '13800138008', 'e10adc3949ba59abbe56e057f20f883e', '2002-06-19', '[\"健身\", \"阅读\", \"编程\"]', '中山大学', 'https://randomuser.me/api/portraits/men/9.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('10', '13800138009', 'e10adc3949ba59abbe56e057f20f883e', '2000-08-08', '[\"瑜伽\", \"音乐\", \"绘画\"]', '西安交通大学', 'https://randomuser.me/api/portraits/women/10.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('11', '13800138010', 'e10adc3949ba59abbe56e057f20f883e', '1997-04-12', '[\"阅读\", \"旅行\", \"摄影\"]', '哈尔滨工业大学', 'https://randomuser.me/api/portraits/men/11.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('12', '13800138011', 'e10adc3949ba59abbe56e057f20f883e', '2001-10-28', '[\"篮球\", \"游戏\", \"电影\"]', '四川大学', 'https://randomuser.me/api/portraits/women/12.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('13', '13800138012', 'e10adc3949ba59abbe56e057f20f883e', '1998-07-03', '[\"编程\", \"阅读\", \"音乐\"]', '同济大学', 'https://randomuser.me/api/portraits/men/13.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('14', '13800138013', 'e10adc3949ba59abbe56e057f20f883e', '2002-01-17', '[\"舞蹈\", \"绘画\", \"书法\"]', '南开大学', 'https://randomuser.me/api/portraits/women/14.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('15', '13800138014', 'e10adc3949ba59abbe56e057f20f883e', '1999-11-30', '[\"足球\", \"跑步\", \"健身\"]', '天津大学', 'https://randomuser.me/api/portraits/men/15.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('16', '13800138015', 'e10adc3949ba59abbe56e057f20f883e', '2000-05-22', '[\"烹饪\", \"阅读\", \"电影\"]', '东南大学', 'https://randomuser.me/api/portraits/women/16.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('17', '13800138016', 'e10adc3949ba59abbe56e057f20f883e', '2001-03-08', '[\"游泳\", \"摄影\", \"旅行\"]', '厦门大学', 'https://randomuser.me/api/portraits/men/17.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('18', '13800138017', 'e10adc3949ba59abbe56e057f20f883e', '1998-09-14', '[\"登山\", \"阅读\", \"棋类\"]', '山东大学', 'https://randomuser.me/api/portraits/women/18.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('19', '13800138018', 'e10adc3949ba59abbe56e057f20f883e', '2002-02-25', '[\"编程\", \"健身\", \"音乐\"]', '吉林大学', 'https://randomuser.me/api/portraits/men/19.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('20', '13800138019', 'e10adc3949ba59abbe56e057f20f883e', '2000-12-10', '[\"瑜伽\", \"绘画\", \"阅读\"]', '中南大学', 'https://randomuser.me/api/portraits/women/20.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('21', '13800138020', 'e10adc3949ba59abbe56e057f20f883e', '1997-06-18', '[\"阅读\", \"旅行\", \"摄影\"]', '湖南大学', 'https://randomuser.me/api/portraits/men/21.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('22', '13800138021', 'e10adc3949ba59abbe56e057f20f883e', '2001-08-23', '[\"篮球\", \"游戏\", \"电影\"]', '重庆大学', 'https://randomuser.me/api/portraits/women/22.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('23', '13800138022', 'e10adc3949ba59abbe56e057f20f883e', '1998-04-07', '[\"编程\", \"阅读\", \"音乐\"]', '大连理工大学', 'https://randomuser.me/api/portraits/men/23.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('24', '13800138023', 'e10adc3949ba59abbe56e057f20f883e', '2002-10-15', '[\"舞蹈\", \"绘画\", \"书法\"]', '西北工业大学', 'https://randomuser.me/api/portraits/women/24.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('25', '13800138024', 'e10adc3949ba59abbe56e057f20f883e', '1999-02-28', '[\"足球\", \"跑步\", \"健身\"]', '中国人民大学', 'https://randomuser.me/api/portraits/men/25.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('26', '13800138025', 'e10adc3949ba59abbe56e057f20f883e', '2000-07-11', '[\"烹饪\", \"阅读\", \"电影\"]', '北京师范大学', 'https://randomuser.me/api/portraits/women/26.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('27', '13800138026', 'e10adc3949ba59abbe56e057f20f883e', '2001-01-03', '[\"游泳\", \"摄影\", \"旅行\"]', '华东师范大学', 'https://randomuser.me/api/portraits/men/27.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('28', '13800138027', 'e10adc3949ba59abbe56e057f20f883e', '1998-03-19', '[\"登山\", \"阅读\", \"棋类\"]', '华南理工大学', 'https://randomuser.me/api/portraits/women/28.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('29', '13800138028', 'e10adc3949ba59abbe56e057f20f883e', '2002-05-06', '[\"编程\", \"健身\", \"音乐\"]', '电子科技大学', 'https://randomuser.me/api/portraits/men/29.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('30', '13800138029', 'e10adc3949ba59abbe56e057f20f883e', '2000-11-21', '[\"瑜伽\", \"绘画\", \"阅读\"]', '兰州大学', 'https://randomuser.me/api/portraits/women/30.jpg', '2026-01-13 00:39:32', '2026-01-13 00:39:32'), ('31', '18866669999', '123456789', '2026-03-06', '[\"科幻\", \"历史\", \"文学\"]', '北京邮电大学', null, '2026-01-26 13:09:46', '2026-03-14 01:34:34'), ('32', '18786898944', 'scrypt:32768:8:1$qsyecbQBzCZ4uwyY$af74dfc4fa33cef0507fe1736005ccc226c2dde7cc69b1947ca5adc1cd4c050df1eef22328a1c2646382c44338e8b3e3c2590f701c017bfeab92480bab04dba8', '2026-03-06', '[\"科幻\"]', '北京邮电大学', null, '2026-03-13 18:02:53', '2026-03-13 18:02:53'), ('33', '18786898989', 'scrypt:32768:8:1$gHYSDwhjCYtqPH0p$8ee62153b6286176692aa0ac7914859c09d30a65d049be4ad800babb32b8bd79d87216e28c033ad53ea90228c19b124b8c076c99cad685cc0fdd8a5b5078a11a', '2026-03-06', '[\"科幻\"]', '北京邮电大学', null, '2026-03-14 08:30:42', '2026-03-14 08:30:42');
COMMIT;

-- ----------------------------
-- View structure for book_details
-- ----------------------------
DROP VIEW IF EXISTS `book_details`;
CREATE ALGORITHM=UNDEFINED DEFINER=`ldc`@`%` SQL SECURITY DEFINER VIEW `book_details` AS select `b`.`book_id` AS `book_id`,`b`.`title` AS `title`,`b`.`author` AS `author`,`b`.`total_copies` AS `total_copies`,`b`.`available_copies` AS `available_copies`,`b`.`publish_date` AS `publish_date`,`b`.`cover_url` AS `cover_url` from `books` `b` ;

-- ----------------------------
-- View structure for user_borrowings
-- ----------------------------
DROP VIEW IF EXISTS `user_borrowings`;
CREATE ALGORITHM=UNDEFINED DEFINER=`ldc`@`%` SQL SECURITY DEFINER VIEW `user_borrowings` AS select `u`.`user_id` AS `user_id`,`u`.`phone` AS `phone`,`b`.`title` AS `title`,`br`.`borrow_time` AS `borrow_time`,`br`.`due_time` AS `due_time`,`br`.`return_time` AS `return_time`,`br`.`status` AS `status` from ((`borrow_records` `br` join `users` `u` on((`br`.`user_id` = `u`.`user_id`))) join `books` `b` on((`br`.`book_id` = `b`.`book_id`))) ;

-- ----------------------------
-- Procedure structure for sp_add_book
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_add_book`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_add_book`(
    IN p_isbn VARCHAR(20),
    IN p_title VARCHAR(255),
    IN p_author VARCHAR(100),
    IN p_genres JSON,
    IN p_introduction TEXT,
    IN p_publish_date DATE,
    IN p_total_copies INT,
    IN p_cover_url VARCHAR(255)
)
BEGIN
-- 检查必填字段是否为空
    IF p_isbn IS NULL OR p_isbn = '' 
       OR p_title IS NULL OR p_title = '' 
       OR p_author IS NULL OR p_author = '' 
       OR p_total_copies IS NULL OR p_total_copies <= 0 THEN
        SELECT 'Invalid input: required fields missing' AS message;
    ELSEIF
    -- 检查ISBN是否已存在
			EXISTS (SELECT 1 FROM books WHERE isbn = p_isbn) THEN
					SELECT 'ISBN already exists' AS message;
    ELSE
        -- 添加新图书
        INSERT INTO books (isbn, title, author, genres, introduction, publish_date, total_copies, available_copies, cover_url)
        VALUES (p_isbn, p_title, p_author, p_genres, p_introduction, p_publish_date, p_total_copies, p_total_copies, p_cover_url);
        
        -- 返回新图书的book_id
        SELECT LAST_INSERT_ID() AS book_id;
    END IF;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_add_favorite
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_add_favorite`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_add_favorite`(
    IN p_user_id INT,
    IN p_book_id INT
)
BEGIN
    -- 添加收藏记录
    INSERT INTO favorites (user_id, book_id)
    VALUES (p_user_id, p_book_id);

    SELECT LAST_INSERT_ID() AS favorite_id;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_add_review
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_add_review`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_add_review`(
    IN p_user_id INT,
    IN p_book_id INT,
    IN p_rating TINYINT,
    IN p_comment TEXT
)
BEGIN
    DECLARE review_exists INT;

    -- 检查是否已有评论
    SELECT COUNT(*) INTO review_exists
    FROM reviews
    WHERE user_id = p_user_id AND book_id = p_book_id;

    IF review_exists > 0 THEN
        -- 更新评论
        UPDATE reviews
        SET rating = p_rating, comment = p_comment, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id AND book_id = p_book_id;
        SELECT 'Review updated successfully' AS message;
    ELSE
        -- 添加评论
        INSERT INTO reviews (user_id, book_id, rating, comment)
        VALUES (p_user_id, p_book_id, p_rating, p_comment);
        
        SELECT LAST_INSERT_ID() AS review_id;
    END IF;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_borrow_book
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_borrow_book`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_borrow_book`(
    IN p_user_id INT,
    IN p_book_id INT
)
BEGIN
    DECLARE available INT;
    DECLARE borrow_record_id INT;

    -- 检查图书可借状态
    SELECT available_copies INTO available
    FROM books
    WHERE book_id = p_book_id;

    IF available > 0 THEN
        -- 借阅图书
        INSERT INTO borrow_records (user_id, book_id, borrow_time, due_time, status)
        VALUES (p_user_id, p_book_id, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 'borrowed');
        
        -- 更新可借副本数
        UPDATE books
        SET available_copies = available_copies - 1
        WHERE book_id = p_book_id;

        -- 返回借阅记录ID
        SELECT LAST_INSERT_ID() AS record_id;
    ELSE
        SELECT 'No available copies' AS message;
    END IF;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_cancel_reservation
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_cancel_reservation`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_cancel_reservation`(
    IN p_reservation_id INT
)
BEGIN
    -- 取消预约
    UPDATE reservations
    SET status = 'cancelled'
    WHERE reservation_id = p_reservation_id;

    SELECT 'Reservation cancelled successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_check_reservation_availability
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_check_reservation_availability`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_check_reservation_availability`(
    IN p_user_id INT,
    IN p_book_id INT
)
BEGIN
    DECLARE available INT;

    -- 检查图书是否可借
    SELECT available_copies INTO available
    FROM books
    WHERE book_id = p_book_id;

    IF available > 0 THEN
        SELECT 'Book is available for borrowing' AS message;
    ELSE
        -- 检查是否已有预约
        IF EXISTS (SELECT 1 FROM reservations WHERE user_id = p_user_id AND book_id = p_book_id AND status = 'waiting') THEN
            SELECT 'You have already reserved this book' AS message;
        ELSE
            SELECT 'You can reserve this book' AS message;
        END IF;
    END IF;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_deactivate_user
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_deactivate_user`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_deactivate_user`(
    IN p_user_id INT,
    IN p_status ENUM('suspended', 'deleted')
)
BEGIN
    -- 更新用户状态
    UPDATE users
    SET status = p_status, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    SELECT 'User status updated successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_generate_borrow_report
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_generate_borrow_report`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_generate_borrow_report`(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- 生成借阅报表
    SELECT b.title, COUNT(br.record_id) AS borrow_count
    FROM borrow_records br
    JOIN books b ON br.book_id = b.book_id
    WHERE br.borrow_time BETWEEN p_start_date AND p_end_date
    GROUP BY b.book_id;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_get_book_detail
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_get_book_detail`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_get_book_detail`(
    IN p_book_id INT
)
BEGIN
    -- 获取图书的详细信息
    SELECT book_id, isbn, title, author, genres, introduction, publish_date, total_copies, available_copies, cover_url
    FROM books
    WHERE book_id = p_book_id;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_get_recommendations
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_get_recommendations`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_get_recommendations`(
    IN p_user_id INT,
    IN p_page INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT;
    SET v_offset = (p_page - 1) * p_page_size;

    -- 获取用户推荐图书
    SELECT b.book_id, b.title, b.author, b.genres, b.introduction, b.publish_date, b.cover_url
    FROM ai_recommendations ar
    JOIN books b ON ar.book_id = b.book_id
    WHERE ar.user_id = p_user_id
    LIMIT p_page_size OFFSET v_offset;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_get_user_favorites
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_get_user_favorites`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_get_user_favorites`(
    IN p_user_id INT,
    IN p_page INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT;
    SET v_offset = (p_page - 1) * p_page_size;

    -- 获取用户收藏的图书
    SELECT b.book_id, b.title, b.author, b.genres, b.introduction, b.publish_date, b.cover_url
    FROM favorites f
    JOIN books b ON f.book_id = b.book_id
    WHERE f.user_id = p_user_id
    LIMIT p_page_size OFFSET v_offset;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_get_user_notifications
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_get_user_notifications`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_get_user_notifications`(
    IN p_user_id INT,
    IN p_type ENUM('system', 'due_reminder', 'reservation', 'news'),
    IN p_is_read BOOLEAN,
    IN p_page INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT;
    SET v_offset = (p_page - 1) * p_page_size;

    -- 获取用户的所有通知
    SELECT notification_id, sender_id, title, content, type, is_read, created_at
    FROM notifications
    WHERE receiver_id = p_user_id 
      AND type = p_type 
      AND is_read = p_is_read
    LIMIT p_page_size OFFSET v_offset;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_get_user_stats
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_get_user_stats`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_get_user_stats`(IN p_user_id INT)
BEGIN
    DECLARE v_total_books INT DEFAULT 0;
    DECLARE v_borrowed_this_month INT DEFAULT 0;
    DECLARE v_current_borrowed INT DEFAULT 0;
    DECLARE v_favorite_category VARCHAR(255) DEFAULT '';
    
    -- 总借阅量
    SELECT COUNT(*) INTO v_total_books 
    FROM borrow_records 
    WHERE user_id = p_user_id;
    
    -- 本月借阅量
    SELECT COUNT(*) INTO v_borrowed_this_month 
    FROM borrow_records 
    WHERE user_id = p_user_id 
      AND YEAR(borrow_time) = YEAR(NOW()) 
      AND MONTH(borrow_time) = MONTH(NOW());
    
    -- 当前在借数量
    SELECT COUNT(*) INTO v_current_borrowed
    FROM borrow_records
    WHERE user_id = p_user_id AND status = 'borrowed';
    
    -- 最爱分类（借阅最多的图书类型）
    SELECT JSON_UNQUOTE(JSON_EXTRACT(b.genres, '$[0]')) INTO v_favorite_category
    FROM borrow_records br
    JOIN books b ON br.book_id = b.book_id
    WHERE br.user_id = p_user_id AND b.genres IS NOT NULL
    GROUP BY b.genres
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- 返回统计结果
    SELECT 
        v_total_books AS total_books,
        v_borrowed_this_month AS borrowed_this_month,
        v_current_borrowed AS current_borrowed,
        IFNULL(v_favorite_category, '暂无') AS favorite_category;
    
    -- 返回近6个月借阅趋势
    SELECT 
        DATE_FORMAT(borrow_time, '%Y-%m') AS month,
        COUNT(*) AS count
    FROM borrow_records
    WHERE user_id = p_user_id
      AND borrow_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(borrow_time, '%Y-%m')
    ORDER BY month;
    
    -- 返回分类分布
    SELECT 
        JSON_UNQUOTE(JSON_EXTRACT(b.genres, '$[0]')) AS category,
        COUNT(*) AS count
    FROM borrow_records br
    JOIN books b ON br.book_id = b.book_id
    WHERE br.user_id = p_user_id AND b.genres IS NOT NULL
    GROUP BY b.genres
    ORDER BY count DESC
    LIMIT 10;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_grant_admin
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_grant_admin`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_grant_admin`(
    IN p_user_id INT,
    IN p_level ENUM('super', 'normal'),
    IN p_permissions JSON
)
BEGIN
    -- 授予管理员权限
    INSERT INTO admins (user_id, level, permissions)
    VALUES (p_user_id, p_level, p_permissions);

    SELECT 'Admin privileges granted successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_login_user
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_login_user`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_login_user`(
    IN p_phone VARCHAR(15),
    IN p_password VARCHAR(255)
)
BEGIN
    DECLARE user_found INT DEFAULT 0;
    DECLARE user_status VARCHAR(20);
    
    -- 检查用户状态
    SELECT status INTO user_status
    FROM users
    WHERE phone = p_phone AND password_hash = p_password;
    
    -- 检查是否找到用户
    IF FOUND_ROWS() > 0 THEN
        -- 检查用户状态
        IF user_status = 'active' THEN
            -- 登录成功，返回用户信息
            SELECT 
                user_id, 
                phone, 
                birthday, 
                hobbies, 
                school, 
                avatar_url, 
                status,
                created_at
            FROM users
            WHERE phone = p_phone AND password_hash = p_password;
        ELSE
            -- 用户被停用或删除
            SELECT 
                '账户已被停用' AS error_message,
                CONCAT('账户状态: ', user_status) AS message;
        END IF;
    ELSE
        -- 登录失败
        SELECT 
            '登录失败' AS error_message,
            '手机号或密码错误' AS message;
    END IF;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_manage_book_copies
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_manage_book_copies`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_manage_book_copies`(
    IN p_book_id INT,
    IN p_delta INT
)
BEGIN
    -- 更新图书副本数量
    UPDATE books
    SET total_copies = total_copies + p_delta, available_copies = available_copies + p_delta
    WHERE book_id = p_book_id;

    SELECT 'Book copies updated successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_mark_notification_read
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_mark_notification_read`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_mark_notification_read`(
    IN p_notification_id INT
)
BEGIN
    -- 标记通知为已读
    UPDATE notifications
    SET is_read = TRUE
    WHERE notification_id = p_notification_id;

    SELECT 'Notification marked as read' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_process_extension
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_process_extension`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_process_extension`(
    IN p_request_id INT,
    IN p_status VARCHAR(20),
    IN p_admin_note TEXT,
    IN p_duration_days INT
)
BEGIN
    DECLARE v_record_id INT DEFAULT 0;
    DECLARE v_user_id INT DEFAULT 0;
    DECLARE v_current_due_time DATETIME;
    
    -- 获取申请信息
    SELECT record_id, user_id INTO v_record_id, v_user_id
    FROM extension_requests
    WHERE request_id = p_request_id;
    
    IF v_record_id IS NULL THEN
        SELECT '申请不存在' AS message, 0 AS success;
    ELSE
        -- 更新申请状态
        UPDATE extension_requests
        SET status = p_status,
            admin_note = p_admin_note,
            processed_at = NOW()
        WHERE request_id = p_request_id;
        
        -- 如果审批通过，延长归还日期
        IF p_status = 'approved' THEN
            -- 获取当前归还日期
            SELECT due_time INTO v_current_due_time
            FROM borrow_records
            WHERE record_id = v_record_id;
            
            -- 延长归还日期
            UPDATE borrow_records
            SET due_time = DATE_ADD(due_time, INTERVAL p_duration_days DAY),
                renewal_count = renewal_count + 1
            WHERE record_id = v_record_id;
            
            -- 发送通知给用户
            INSERT INTO notifications (sender_id, receiver_id, title, content, type)
            VALUES (1, v_user_id, '延期申请已通过', 
                    CONCAT('您的延期申请已通过，归还日期已延长', p_duration_days, '天。'), 
                    'system');
        ELSE
            -- 拒绝也发送通知
            INSERT INTO notifications (sender_id, receiver_id, title, content, type)
            VALUES (1, v_user_id, '延期申请已拒绝', 
                    CONCAT('您的延期申请已被拒绝。原因：', IFNULL(p_admin_note, '无')), 
                    'system');
        END IF;
        
        SELECT '审批完成' AS message, 1 AS success;
    END IF;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_record_recommendation
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_record_recommendation`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_record_recommendation`(
    IN p_user_id INT,
    IN p_book_id INT
)
BEGIN
    -- 记录推荐
    INSERT INTO ai_recommendations (user_id, book_id)
    VALUES (p_user_id, p_book_id);

    SELECT LAST_INSERT_ID() AS recommendation_id;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_register_user
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_register_user`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_register_user`(
    IN p_phone VARCHAR(15),
    IN p_password VARCHAR(255),
    IN p_birthday DATE,
    IN p_hobbies JSON,
    IN p_school VARCHAR(100),
    IN p_avatar_url VARCHAR(255)
)
BEGIN
    DECLARE error_message VARCHAR(255);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 error_message = MESSAGE_TEXT;
        -- 返回错误信息
        SELECT error_message AS error_message;
    END;
    
    -- 校验：手机号和密码不能为空
    IF p_phone IS NULL OR p_phone = '' OR p_password IS NULL OR p_password = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '手机号和密码不能为空';
    END IF;
    
    -- 检查手机号是否已存在
    IF EXISTS (SELECT 1 FROM users WHERE phone = p_phone) THEN
        SIGNAL SQLSTATE '45001'
        SET MESSAGE_TEXT = '手机号已存在';
    END IF;
    
    -- 插入新用户数据
    INSERT INTO users (phone, password_hash, birthday, hobbies, school, avatar_url)
    VALUES (p_phone, p_password, p_birthday, p_hobbies, p_school, p_avatar_url);
    
    -- 返回新用户的ID
    SELECT 
        LAST_INSERT_ID() AS user_id,
        '注册成功' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_remove_favorite
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_remove_favorite`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_remove_favorite`(
    IN p_user_id INT,
    IN p_book_id INT
)
BEGIN
    -- 移除收藏记录
    DELETE FROM favorites
    WHERE user_id = p_user_id AND book_id = p_book_id;

    SELECT 'Favorite removed successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_remove_favorite_by_id
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_remove_favorite_by_id`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_remove_favorite_by_id`(IN p_favorite_id INT)
BEGIN
    DELETE FROM favorites WHERE favorite_id = p_favorite_id;
    SELECT '收藏已删除' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_renew_book
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_renew_book`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_renew_book`(
    IN p_record_id INT
)
BEGIN
    DECLARE current_due_time DATETIME;

    -- 获取当前借阅记录的due_time
    SELECT due_time INTO current_due_time
    FROM borrow_records
    WHERE record_id = p_record_id;

    -- 检查是否可以续借
    IF current_due_time > NOW() THEN
        -- 更新借阅记录的due_time
        UPDATE borrow_records
        SET due_time = DATE_ADD(due_time, INTERVAL 30 DAY)
        WHERE record_id = p_record_id;

        SELECT 'Book renewed successfully' AS message;
    ELSE
        SELECT 'Cannot renew overdue book' AS message;
    END IF;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_report_book_issue
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_report_book_issue`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_report_book_issue`(
    IN p_record_id INT,
    IN p_user_id INT,
    IN p_type VARCHAR(20),
    IN p_reason TEXT
)
BEGIN
    -- 插入上报记录
    INSERT INTO book_reports (record_id, user_id, type, reason)
    VALUES (p_record_id, p_user_id, p_type, p_reason);
    
    -- 发送通知给管理员（这里假设管理员ID为1，可根据实际情况调整）
    INSERT INTO notifications (sender_id, receiver_id, title, content, type)
    VALUES (p_user_id, 1, 
            CONCAT('用户异常上报：', CASE p_type WHEN 'lost' THEN '书籍遗失' WHEN 'damaged' THEN '书籍损坏' ELSE '其他问题' END),
            p_reason,
            'system');
    
    SELECT '异常已上报，管理员将通过电话联系您' AS message, 1 AS success, LAST_INSERT_ID() AS report_id;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_request_extension
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_request_extension`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_request_extension`(
    IN p_record_id INT,
    IN p_user_id INT,
    IN p_duration_days INT,
    IN p_reason TEXT
)
BEGIN
    DECLARE v_count INT DEFAULT 0;
    
    -- 检查是否有重复待审核的申请
    SELECT COUNT(*) INTO v_count
    FROM extension_requests
    WHERE record_id = p_record_id AND status = 'pending';
    
    IF v_count > 0 THEN
        SELECT '该借阅已有待审核的延期申请' AS message, 0 AS success;
    ELSE
        -- 插入延期申请
        INSERT INTO extension_requests (record_id, user_id, duration_days, reason)
        VALUES (p_record_id, p_user_id, p_duration_days, p_reason);
        
        SELECT '延期申请已提交，请等待审核' AS message, 1 AS success, LAST_INSERT_ID() AS request_id;
    END IF;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_reserve_book
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_reserve_book`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_reserve_book`(
    IN p_user_id INT,
    IN p_book_id INT
)
BEGIN
    DECLARE available INT;

    -- 检查图书是否可借
    SELECT available_copies INTO available
    FROM books
    WHERE book_id = p_book_id;

    IF available = 0 THEN
        -- 如果图书不可借，插入预约记录
        INSERT INTO reservations (user_id, book_id, status, expiry_date)
        VALUES (p_user_id, p_book_id, 'waiting', DATE_ADD(NOW(), INTERVAL 7 DAY));
        
        SELECT LAST_INSERT_ID() AS reservation_id;
    ELSE
        SELECT 'Book is available for borrowing' AS message;
    END IF;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_return_book
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_return_book`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_return_book`(
    IN p_record_id INT
)
BEGIN
    DECLARE book_id INT;
    
    -- 获取借阅记录中的图书ID
    SELECT book_id INTO book_id
    FROM borrow_records
    WHERE record_id = p_record_id;
    
    -- 更新借阅记录状态
    UPDATE borrow_records
    SET return_time = NOW(), status = 'returned'
    WHERE record_id = p_record_id;
    
    -- 更新图书可用副本数
    UPDATE books
    SET available_copies = available_copies + 1
    WHERE book_id = book_id;

    SELECT 'Book returned successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_revoke_admin
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_revoke_admin`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_revoke_admin`(
    IN p_user_id INT
)
BEGIN
    -- 撤销管理员权限
    DELETE FROM admins
    WHERE user_id = p_user_id;

    SELECT 'Admin privileges revoked successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_search_books
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_search_books`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_search_books`(
    IN p_keyword VARCHAR(255),
    IN p_author VARCHAR(100),
    IN p_genres VARCHAR(255),
    IN p_page INT,
    IN p_page_size INT
)
BEGIN
    DECLARE v_offset INT;

    -- 计算偏移量
    SET v_offset = (p_page - 1) * p_page_size;

    -- 返回匹配的图书数量
    SELECT COUNT(*) AS total_count
    FROM books
    WHERE (title LIKE CONCAT('%', p_keyword, '%') OR author LIKE CONCAT('%', p_author, '%'))
    AND (genres LIKE CONCAT('%', p_genres, '%'));

    -- 返回匹配的图书列表
    SELECT book_id, title, author, genres, introduction, publish_date, cover_url
    FROM books
    WHERE (title LIKE CONCAT('%', p_keyword, '%') OR author LIKE CONCAT('%', p_author, '%'))
    AND (genres LIKE CONCAT('%', p_genres, '%'))
    LIMIT v_offset, p_page_size;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_send_notification
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_send_notification`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_send_notification`(
    IN p_sender_id INT,
    IN p_receiver_id INT,
    IN p_title VARCHAR(100),
    IN p_content TEXT,
    IN p_type ENUM('system', 'due_reminder', 'reservation', 'news')
)
BEGIN
    -- 发送通知
    INSERT INTO notifications (sender_id, receiver_id, title, content, type)
    VALUES (p_sender_id, p_receiver_id, p_title, p_content, p_type);

    SELECT LAST_INSERT_ID() AS notification_id;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_update_book_info
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_update_book_info`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_update_book_info`(
    IN p_book_id INT,
    IN p_title VARCHAR(255),
    IN p_author VARCHAR(100),
    IN p_genres JSON,
    IN p_introduction TEXT
)
BEGIN
    -- 更新图书信息
    UPDATE books
    SET title = p_title, author = p_author, genres = p_genres, introduction = p_introduction, updated_at = CURRENT_TIMESTAMP
    WHERE book_id = p_book_id;

    SELECT 'Book information updated successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_update_recommendation_feedback
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_update_recommendation_feedback`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_update_recommendation_feedback`(
    IN p_recommendation_id INT,
    IN p_feedback ENUM('like', 'dislike', 'none')
)
BEGIN
    -- 更新反馈
    UPDATE ai_recommendations
    SET feedback = p_feedback, feedback_at = CURRENT_TIMESTAMP
    WHERE recommendation_id = p_recommendation_id;

    SELECT 'Feedback updated successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Procedure structure for sp_update_user_profile
-- ----------------------------
DROP PROCEDURE IF EXISTS `sp_update_user_profile`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` PROCEDURE `sp_update_user_profile`(
    IN p_user_id INT,
    IN p_birthday DATE,
    IN p_hobbies JSON,
    IN p_school VARCHAR(100),
    IN p_avatar_url VARCHAR(255)
)
BEGIN
    -- 更新用户信息
    UPDATE users
    SET birthday = p_birthday, hobbies = p_hobbies, school = p_school, avatar_url = p_avatar_url, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;
    
    SELECT 'Profile updated successfully' AS message;
END
;;
DELIMITER ;

-- ----------------------------
-- Event structure for clean_expired_reservations
-- ----------------------------
DROP EVENT IF EXISTS `clean_expired_reservations`;
DELIMITER ;;
CREATE DEFINER=`ldc`@`%` EVENT `clean_expired_reservations` ON SCHEDULE EVERY 1 DAY STARTS '2025-08-31 01:44:42' ON COMPLETION NOT PRESERVE ENABLE DO DELETE FROM reservations WHERE expiry_date < NOW()
;;
DELIMITER ;

-- ----------------------------
-- Auto increment value for activities
-- ----------------------------
ALTER TABLE `activities` AUTO_INCREMENT=3;

-- ----------------------------
-- Auto increment value for activity_comments
-- ----------------------------
ALTER TABLE `activity_comments` AUTO_INCREMENT=1;

-- ----------------------------
-- Auto increment value for activity_likes
-- ----------------------------
ALTER TABLE `activity_likes` AUTO_INCREMENT=1;

-- ----------------------------
-- Auto increment value for activity_posts
-- ----------------------------
ALTER TABLE `activity_posts` AUTO_INCREMENT=1;

-- ----------------------------
-- Auto increment value for activity_registrations
-- ----------------------------
ALTER TABLE `activity_registrations` AUTO_INCREMENT=3;

-- ----------------------------
-- Auto increment value for activity_summaries
-- ----------------------------
ALTER TABLE `activity_summaries` AUTO_INCREMENT=1;

-- ----------------------------
-- Auto increment value for activity_summary_likes
-- ----------------------------
ALTER TABLE `activity_summary_likes` AUTO_INCREMENT=1;

-- ----------------------------
-- Auto increment value for admins
-- ----------------------------
ALTER TABLE `admins` AUTO_INCREMENT=8;

-- ----------------------------
-- Auto increment value for ai_chat_history
-- ----------------------------
ALTER TABLE `ai_chat_history` AUTO_INCREMENT=14;

-- ----------------------------
-- Auto increment value for ai_recommendations
-- ----------------------------
ALTER TABLE `ai_recommendations` AUTO_INCREMENT=31;

-- ----------------------------
-- Auto increment value for book_reports
-- ----------------------------
ALTER TABLE `book_reports` AUTO_INCREMENT=1;

-- ----------------------------
-- Auto increment value for book_reviews
-- ----------------------------
ALTER TABLE `book_reviews` AUTO_INCREMENT=2;

-- ----------------------------
-- Auto increment value for books
-- ----------------------------
ALTER TABLE `books` AUTO_INCREMENT=133;

-- ----------------------------
-- Auto increment value for borrow_records
-- ----------------------------
ALTER TABLE `borrow_records` AUTO_INCREMENT=82;

-- ----------------------------
-- Auto increment value for borrow_requests
-- ----------------------------
ALTER TABLE `borrow_requests` AUTO_INCREMENT=11;

-- ----------------------------
-- Auto increment value for browse_history
-- ----------------------------
ALTER TABLE `browse_history` AUTO_INCREMENT=86;

-- ----------------------------
-- Auto increment value for extension_requests
-- ----------------------------
ALTER TABLE `extension_requests` AUTO_INCREMENT=1;

-- ----------------------------
-- Auto increment value for favorites
-- ----------------------------
ALTER TABLE `favorites` AUTO_INCREMENT=84;

-- ----------------------------
-- Auto increment value for notifications
-- ----------------------------
ALTER TABLE `notifications` AUTO_INCREMENT=77;

-- ----------------------------
-- Auto increment value for reservations
-- ----------------------------
ALTER TABLE `reservations` AUTO_INCREMENT=26;

-- ----------------------------
-- Auto increment value for users
-- ----------------------------
ALTER TABLE `users` AUTO_INCREMENT=34;
