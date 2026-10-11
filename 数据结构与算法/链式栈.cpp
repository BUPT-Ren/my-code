
/* 为什么栈顶放在链表头部（而不是尾部）
栈只在一端操作（后进先出）。
单链表里，在头部插入/删除是 O(1)，
而在尾部插入/删除要遍历到末尾、是 O(n)。
所以把栈顶放在链表头，
push 和 pop 都能 O(1) 完成： */
# include<iostream>
# include<cstring>
using namespace std;

class LinkStack{
    public:
        LinkStack(){
            head_ = new Node;
        }

        ~LinkStack(){
           Node *p = head_;
           //头节点也要删除
           while(p != nullptr){
             head_ = head_->next_;
             delete p;
             p = head_;
           }   
        }
    public:
        //链表没有栈满的概念
        //入栈 把链表头节点后面 
        //第一个有效节点的位置当作栈顶
        void push(int val){
            Node *node = new Node(val);
            node->next_= head_->next_;
            head_->next_ = node;
            size_++;
        }
        //出栈操作 出栈前先判空
        void pop(){
            if (head_->next_ == nullptr){
                throw "stack is empty";
            }
            Node *p = head_->next_;
            head_->next_ = p->next_;
            delete p;
            size_--;
        }
        //获取栈顶元素 只要是获取元素 
        //操作之前都需要判空
        int top() const{
            if (head_->next_ == nullptr){
                throw "stack is empty";
            }
            return head_->next_->data_;
        }
        //判空
        bool empty(){
            return head_->next_ == nullptr;
        }
        //返回栈的元素个数
        //遍历一遍链表 记录节点个数
        //复杂度：O（n）
        //想达到O(1)
        //用一个成员变量来记录个数
        int size() const{
            return size_;
        }
    private:
            struct Node{  //把结构体作为链式栈的成员变量
            int data_;
            Node *next_;
            Node(int data = 0):
            data_(data),
            next_(nullptr)
            {}
        };
        int size_;
        Node *head_;  //head_ 是 LinkStack 的成员，放在 Node 定义之后
 };

int main(){
    LinkStack s;

    //1. 空栈判空
    cout << "empty: " << s.empty() << endl;

    //2. 入栈 + 栈顶
    s.push(10);
    s.push(20);
    s.push(30);
    cout << "top: " << s.top() << endl;   // 期望 30

    //3. 出栈，验证后进先出
    cout << "pop sequence: ";
    while (!s.empty()){
        cout << s.top() << " ";
        s.pop();
    }
    cout << endl;
    cout << "empty after all pop: " << s.empty() << endl;

    //4. 空栈抛异常
    LinkStack e;
    try {
        e.pop();
    } catch (const char* msg){
        cout << "pop on empty -> " << msg << endl;
    }
    try {
        e.top();
    } catch (const char* msg){
        cout << "top on empty -> " << msg << endl;
    }

    return 0;
}