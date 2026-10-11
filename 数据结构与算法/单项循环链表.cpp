#include<iostream>

using namespace std;

//单项循环链表
class CircleLink{
 private:
    struct Node{  //把结构体作为循环链表的成员变量
        int data_;
        Node *next_;
        Node(int data = 0):data_(data),next_(nullptr){}
    };
    Node *head_;
    Node *tail_;  //为了方便尾插，我们在这里引入尾节点
    //必须维护tail的状态
public:
    CircleLink(){ //只有一个节点，tail指针也应当指向自己
        head_ = new Node();
        head_->next_ = head_; //next指针指向自己
        tail_ = head_;
    }
    ~CircleLink(){
       Node *p = head_->next_;
       while(p != head_){
        head_->next_ = p->next_;
        delete p;
        p = head_->next_;
       }
       delete head_;
    }
public:
//与单向链表不同，由于循环链表有尾指针，所以不需要再遍历
//找最后一个节点
    void InsertTail(int val){
        Node *node = new Node(val);
        node->next_ = tail_->next_;
        tail_->next_ = node;
        tail_ = node; //更新tail指针指向新节点
    }
    //头插法
    void InsertHead(int val){
        Node *node = new Node(val);
        node->next_ = head_->next_;//第一个节点head_->next_仍然指向自己
        head_->next_ = node;
        if (node->next_ == head_){ //相当于插进来的这个节点
             //既是第一节点也是尾节点，需要让尾指针指向它
             tail_ = node;
        }
    }
    //节点的删除
    //如果删除末尾节点，要重置tail
    void Remove(int val){
        Node *q = head_;
        Node *p = head_->next_;
        while(p != head_){
            if (p->data_ == val){
                //找到删除节点
                q->next_ = p->next_; //q跟在p后边
                delete p;
                if (q->next_ == head_){
                    tail_ = q;
                }
                return;
            }
            p = p->next_;
            q = q->next_;
        }
    }
    //查询节点
    bool Find(int val){
        Node *p = head_->next_;// 从第一节点开始查询 
        while(p->next_ != head_){
            if(p->data_ == val){
                return true;
            }
            else{
                p = p->next_;
            }
        }
        return false;  //查不到就返回false
    }
    //打印链表（含尾节点），方便观察结果
    void print() const{
        Node *p = head_->next_;
        while(p != head_){
            cout << p->data_ << " ";
            p = p->next_;
        }
        if (tail_ != head_){
            cout << "(tail=" << tail_->data_ << ")";
        }
        cout << endl;
    }
};

int main(){
    // 尾插法插入 1,2,3
    {
        CircleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        cout << "尾插 1,2,3 (应为 1 2 3 tail=3): ";
        list.print();
    }
    // 头插法插入 0
    {
        CircleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        list.InsertHead(0);
        cout << "再头插 0 (应为 0 1 2 3 tail=3): ";
        list.print();
    }
    // 删除中间节点
    {
        CircleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        list.Remove(2);
        cout << "删除中间 2 (应为 1 3 tail=3): ";
        list.print();
    }
    // 删除尾节点
    {
        CircleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        list.Remove(3);
        cout << "删除尾 3 (应为 1 2 tail=2): ";
        list.print();
    }
    // 删除头节点
    {
        CircleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.InsertTail(3);
        list.Remove(1);
        cout << "删除头 1 (应为 2 3 tail=3): ";
        list.print();
    }
    // 删除唯一节点
    {
        CircleLink list;
        list.InsertTail(1);
        list.Remove(1);
        cout << "删除唯一节点 1 (应为空): ";
        list.print();
    }
    // 删除不存在的节点
    {
        CircleLink list;
        list.InsertTail(1);
        list.InsertTail(2);
        list.Remove(999);
        cout << "删除不存在 999 (应为 1 2 tail=2): ";
        list.print();
    }
    // 混合操作
    {
        CircleLink list;
        list.InsertHead(1);
        list.InsertHead(2);
        list.InsertTail(3);
        list.InsertTail(4);
        list.Remove(2);
        list.Remove(4);
        cout << "混合操作 (应为 1 3 tail=3): ";
        list.print();
    }
    return 0;
}
