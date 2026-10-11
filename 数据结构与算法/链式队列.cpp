
//基于双向循环链表实现链式队列
# include<iostream>
using namespace std;

class LinkQueue{
    public:
        LinkQueue(){
            head_ = new Node();
            head_->next_ = head_;
            head_->pre_ = head_;
        }
        ~LinkQueue(){
            Node *p = head_->next_;
            while(p != head_){
                head_->next_ = p->next_;
                p->next_->pre_ = head_;
                delete p;
                p = head_->next_;
            }
            delete p;
        }
    public:
        //入队
        void push(int val){
            Node *node = new Node(val);
            //找到最后一个节点
            Node *p = head_->pre_;
            //改指针 
            //成对
            node->next_ = head_;
            head_->pre_ = node;

            p->next_ = node;
            node->pre_ = p;
            size_++;
        }
        //出队
        //链式栈 出队从第一节点出

        void pop(){
            if (head_->next_ == head_){
                throw "the Linkqueue is empty";
            }
            Node *p = head_->next_;
            head_->next_ = p->next_;
            p->next_->pre_ = head_;
            delete p;
            size_--;
        }
        //获取队头（尾节点）元素
        int front() const{
            if (head_->next_ == head_){
                throw "the LinkQueue is empty";
            }
            return head_->next_->data_;
        }
        //获取队尾元素
        int back() const{
            if (head_->next_ == head_){
                throw "the LinkQueue is empty";
            }
            return head_->pre_->data_;
        }
        //判空
        bool empty(){
            if (head_->next_ == head_){
                return true;
            }
            else{
                return false;
            }
        }
        //获取链式队列长度
        int size(){
            return size_;
        }
    private:
             struct Node{
            int data_;
            Node *next_;
            Node *pre_;
            Node(int data = 0) :
             data_(data), 
             next_(nullptr), 
             pre_(nullptr)
             {
             }
         };
            //指向头节点
            Node *head_;
            int size_ = 0;
};

// ==================== 测试用例 ====================
int g_pass = 0, g_fail = 0;

void check(bool ok, const char* name){
    if (ok){
        ++g_pass;
        cout << "[PASS] " << name << endl;
    } else {
        ++g_fail;
        cout << "[FAIL] " << name << endl;
    }
}

int main(){
    // 1. 初始状态：空队列
    LinkQueue q;
    check(q.empty() == true, "空队列 empty() 为 true");
    check(q.size() == 0, "空队列 size() 为 0");

    // 2. 空队列访问/出队应抛异常
    bool threw = false;
    try { q.front(); } catch (...) { threw = true; }
    check(threw, "空队列 front() 抛异常");

    threw = false;
    try { q.back(); } catch (...) { threw = true; }
    check(threw, "空队列 back() 抛异常");

    threw = false;
    try { q.pop(); } catch (...) { threw = true; }
    check(threw, "空队列 pop() 抛异常");

    // 3. 入队与访问
    q.push(1);
    q.push(2);
    q.push(3);
    check(q.size() == 3, "入队 3 个后 size() 为 3");
    check(q.front() == 1, "队头为 1");
    check(q.back() == 3, "队尾为 3");
    check(q.empty() == false, "非空队列 empty() 为 false");

    // 4. 出队（FIFO 顺序）
    q.pop();
    check(q.front() == 2, "pop 后队头为 2");
    check(q.size() == 2, "pop 后 size() 为 2");
    q.pop();
    check(q.front() == 3, "再 pop 后队头为 3");
    q.pop();
    check(q.empty() == true, "全部 pop 后为空");
    check(q.size() == 0, "全部 pop 后 size() 为 0");

    // 5. 交替出入队，验证 FIFO 顺序
    LinkQueue q2;
    for (int i = 0; i < 100; ++i) q2.push(i);
    bool order_ok = true;
    for (int i = 0; i < 100; ++i){
        if (q2.front() != i) order_ok = false;
        q2.pop();
    }
    check(order_ok, "100 个元素 FIFO 顺序正确");
    check(q2.empty() == true, "出队 100 个后为空");

    // 6. 大数量压测（析构是否崩溃/泄漏可用 valgrind 或 ASan 验证）
    LinkQueue q3;
    for (int i = 0; i < 100000; ++i) q3.push(i);
    check(q3.size() == 100000, "入队 10 万个后 size 正确");
    for (int i = 0; i < 100000; ++i) q3.pop();
    check(q3.size() == 0, "出队 10 万个后为空");

    cout << "\n结果: " << g_pass << " 通过, " << g_fail << " 失败" << endl;
    return g_fail == 0 ? 0 : 1;
}